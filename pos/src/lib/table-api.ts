import { DOCTYPES } from '../data/doctypes';
import { db } from './frappe-sdk';

export interface Room {
  name: string;
  branch: string;
}

export interface Table {
  name: string;
  occupied: number;
  latest_invoice_time: string | null;
  is_take_away: number;
  restaurant_room: string;
  table_shape: 'Circle' | 'Square' | 'Rectangle';
  no_of_seats?: number;
  layout_x?: number;
  layout_y?: number;
  minimum_seating?: number;
}


export async function getRestaurantMenu(posProfile: string, room?: string | null) {
  const { call } = await import('./frappe-sdk');
  const params: Record<string, string> = { pos_profile: posProfile };
  if (room) {
    params.room = room;
  }
  const res = await call.get('ury.ury_pos.api.getRestaurantMenu', params);
  return res.message;
}

export async function getRooms(branch: string): Promise<Room[]> {
  const rooms = await db.getDocList(DOCTYPES.URY_ROOM, {
    fields: ['name', 'branch'],
    filters: [['branch', 'like', branch]],
    limit: "*" as unknown as number,
    asDict: true,
  });
  return rooms as Room[];
}

export async function getTableCount(room: string, branch?: string): Promise<number> {
  const filters = [
    ['restaurant_room', '=', room],
    ...(branch ? [['branch', '=', branch]] : []),
  ];
  const rows = await db.getDocList(DOCTYPES.URY_TABLE, {
    fields: ['count(name) as count'],
    filters: filters as any,
    limit: 1,
    asDict: true,
  }) as Array<{ count?: number | string }>;
  const countValue = rows[0]?.count ?? 0;
  return typeof countValue === 'number' ? countValue : Number(countValue) || 0;
}

/** Uses whitelisted API so layout_* fields are only queried when they exist on URY Table. */
export async function getTables(room: string, branch?: string): Promise<Table[]> {
  const { call } = await import('./frappe-sdk');
  const params: Record<string, string> = { room };
  if (branch) {
    params.branch = branch;
  }
  const res = await call.get('ury.ury_pos.api.getTablesForRoom', params);
  return (res.message ?? []) as Table[];
}


export async function updateTableLayout(name: string, data: Partial<Table>) {
  return db.updateDoc(DOCTYPES.URY_TABLE, name, data);
}
