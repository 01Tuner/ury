import { call } from './frappe-sdk';

export interface ProductionUnit {
  name: string;
  production: string;
}

interface GetProductionUnitsResponse {
  message: ProductionUnit[];
}

export async function getProductionUnitsForBranch(
  branch?: string
): Promise<ProductionUnit[]> {
  const params = branch ? { branch } : {};
  const res = await call.get<GetProductionUnitsResponse>(
    'ury.ury_pos.api.get_production_units_for_branch',
    params
  );
  return res.message ?? [];
}
