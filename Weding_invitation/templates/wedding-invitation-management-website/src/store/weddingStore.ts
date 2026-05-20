// Thin re-export layer for backward compatibility.
// All actual logic is now in src/api.ts, which calls the Django backend.

export {
  apiGetGuests as getGuests,
  apiAddGuest as addGuest,
  apiDeleteGuest as deleteGuest,
  apiGetGuestByToken as getGuestByToken,
  apiSubmitRSVP as submitRSVP,
  apiCheckAuth as checkAdminPassword,
  apiChangePassword as changeAdminPassword,
  apiGetWeddingInfo as getWeddingInfo,
  apiSaveWeddingInfo as saveWeddingInfo,
  generateInviteLink,
} from '../api';
