import frappe
from frappe.utils import flt


def get_pos_closing_print_details(doc):
	"""Return item/category aggregates for POS Closing Summary print format."""
	invoice_names = _get_invoice_names(doc)
	if not invoice_names:
		return {"item_wise": [], "category_wise": []}

	return {
		"item_wise": frappe.db.sql(
			"""
			SELECT
				pii.item_name AS item,
				pii.uom AS size,
				pii.rate AS rate,
				SUM(pii.qty) AS qty,
				SUM(pii.amount) AS amount
			FROM `tabPOS Invoice Item` pii
			WHERE pii.parent IN %(invoices)s
			GROUP BY pii.item_code, pii.item_name, pii.uom, pii.rate
			ORDER BY pii.item_name
			""",
			{"invoices": invoice_names},
			as_dict=True,
		),
		"category_wise": frappe.db.sql(
			"""
			SELECT
				COALESCE(NULLIF(pii.item_group, ''), 'Uncategorized') AS category,
				SUM(pii.qty) AS qty,
				SUM(pii.amount) AS amount
			FROM `tabPOS Invoice Item` pii
			WHERE pii.parent IN %(invoices)s
			GROUP BY pii.item_group
			ORDER BY pii.item_group
			""",
			{"invoices": invoice_names},
			as_dict=True,
		),
	}


def get_pos_closing_cashier_summary(doc):
	"""Build cashier summary rows from doc.payment_reconciliation and sub closings."""
	cashiers = [_cashier_row_from_payments(doc.user, doc.payment_reconciliation)]

	if not frappe.db.get_value("POS Profile", doc.pos_profile, "custom_enable_multiple_cashier"):
		return cashiers

	sub_closings = frappe.get_all(
		"Sub POS Closing",
		filters={
			"pos_profile": doc.pos_profile,
			"docstatus": 1,
			"period_start_date": [">=", doc.period_start_date],
			"posting_date": ["<=", doc.posting_date],
		},
		fields=["name", "user"],
	)

	for sub in sub_closings:
		payments = frappe.get_all(
			"Sub POS Closing Payment",
			filters={"parent": sub.name},
			fields=["mode_of_payment", "opening_amount", "expected_amount"],
		)
		cashiers.append(_cashier_row_from_payments(sub.user, payments))

	return cashiers


def get_pos_closing_sales_summary(doc):
	"""Build sales summary using doc totals and linked invoice details."""
	invoice_names = _get_invoice_names(doc)
	sales_returns = sales_return_vat = 0

	for row in doc.pos_transactions:
		if row.is_return:
			sales_returns += abs(flt(row.grand_total))

	vat_amt = sum(flt(t.amount) for t in doc.taxes)

	if invoice_names:
		invoice_totals = frappe.db.sql(
			"""
			SELECT total, discount_amount, total_taxes_and_charges, is_return
			FROM `tabPOS Invoice`
			WHERE name IN %(invoices)s
			""",
			{"invoices": invoice_names},
			as_dict=True,
		)
		gross_total = sum(flt(i.total) for i in invoice_totals if not i.is_return)
		discount = sum(flt(i.discount_amount) for i in invoice_totals if not i.is_return)
		sales_return_vat = sum(
			abs(flt(i.total_taxes_and_charges)) for i in invoice_totals if i.is_return
		)
	else:
		gross_total = flt(doc.net_total)
		discount = 0

	return {
		"gross_total": gross_total,
		"discount": discount,
		"vat_amt": vat_amt,
		"grand_total": flt(doc.grand_total),
		"sales_returns": sales_returns,
		"sales_return_vat": sales_return_vat,
		"total_vat": vat_amt - sales_return_vat,
		"total_sales": flt(doc.grand_total),
	}


def _get_invoice_names(doc):
	return [row.pos_invoice for row in doc.pos_transactions if row.pos_invoice]


def _cashier_row_from_payments(user, payments):
	cash = bank = 0

	for row in payments:
		amount = flt(row.get("expected_amount") if isinstance(row, dict) else row.expected_amount) - flt(
			row.get("opening_amount") if isinstance(row, dict) else row.opening_amount
		)
		mode = row.get("mode_of_payment") if isinstance(row, dict) else row.mode_of_payment
		payment_type = frappe.get_cached_value("Mode of Payment", mode, "type")

		if payment_type == "Cash":
			cash += amount
		elif payment_type == "Bank":
			bank += amount

	return {
		"cashier": _cashier_label(user),
		"cash": cash,
		"bank": bank,
		"total": cash + bank,
	}


def _cashier_label(user):
	if not user:
		return ""
	return frappe.db.get_value("User", user, "full_name") or user
