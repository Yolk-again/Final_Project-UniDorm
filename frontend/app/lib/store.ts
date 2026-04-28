 /* eslint-disable @typescript-eslint/no-explicit-any */
// lib/store.ts
export let rooms = [
  {
    id: 1,
    roomNumber: "101",
    type: "Single Room",
    furniture: "Fully Furnished",
    price: "5500",
  },
  {
    id: 2,
    roomNumber: "102",
    type: "Studio Room",
    furniture: "Basic Type",
    price: "4000",
  },
];

export let bookings: any[] = [];

export const getRooms = () => [...rooms];
export const addRoom = (room: any) => {
  rooms.push(room);
};
export const deleteRoom = (id: number) => {
  rooms = rooms.filter((r) => r.id !== id);
};
export const updateRoom = (id: number, data: any) => {
  rooms = rooms.map((r) => (r.id === id ? { ...r, ...data } : r));
};

export const getBookings = () => [...bookings];
export const createBooking = (booking: any) => {
  bookings.push(booking);
};
export const updateBookingStatus = (id: number, status: string) => {
  const index = bookings.findIndex((b) => b.id === id);
  if (index !== -1) bookings[index].status = status;
};
export const deleteBooking = (id: number) => {
  bookings = bookings.filter((b) => b.id !== id);
};