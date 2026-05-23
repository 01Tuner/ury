import { call } from './frappe-sdk';

export interface POSOpeningResponse {
  message: number;
}

export interface POSCloseValidationResponse {
  message: string;
}

export const checkPOSOpening = async (): Promise<POSOpeningResponse> => {
  try {
    const response = await call.get<POSOpeningResponse>(
      'ury.ury_pos.api.posOpening'
    );
    
    return response;
  } catch (error) {
    console.error('Error checking POS opening status:', error);
    throw error;
  }
};

export const getActivePosOpeningEntry = async (
  posProfile?: string
): Promise<string | null> => {
  try {
    const response = await call.get<{ message: string | null }>(
      'ury.ury_pos.api.get_active_pos_opening_entry',
      posProfile ? { pos_profile: posProfile } : {}
    );
    return response.message ?? null;
  } catch (error) {
    console.error('Error fetching active POS opening entry:', error);
    return null;
  }
};

export const validatePOSClose = async (posProfile: string): Promise<POSCloseValidationResponse> => {
  try {
    const response = await call.get<POSCloseValidationResponse>(
      'ury.ury_pos.api.validate_pos_close',
      {
        pos_profile: posProfile
      }
    );
    
    return response;
  } catch (error) {
    console.error('Error validating POS close status:', error);
    throw error;
  }
}; 