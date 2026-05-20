export interface Guest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  token: string;
  plusOne: boolean;
  plusOneName?: string;
  rsvpStatus: 'pending' | 'confirmed' | 'declined';
  rsvpDate?: string;
  rsvpMessage?: string;
  numberOfGuests?: number;
  dietaryRestrictions?: string;
  createdAt: string;
}

export interface WeddingInfo {
  groomName: string;
  brideName: string;
  date: string;
  time: string;
  venueName: string;
  venueAddress: string;
  receptionTime: string;
  receptionVenue: string;
  receptionAddress: string;
  dressCode: string;
  rsvpDeadline: string;
}
