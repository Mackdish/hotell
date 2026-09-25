export const defaultUser = {
  id: "student-001",
  name: "April Kamau",
  initials: "AK",
  email: "april.kamau@uon.ac.ke",
  studentId: "SCT/2023/0456",
  institution: "University of Nairobi",
  campus: "Main campus",
  phone: "+254 712 345 678",
  defaultPickupLocation: "main-cafeteria",
  defaultPaymentMethod: "mpesa",
  dietaryPreferences: [],
  notificationSettings: {
    orderUpdates: true,
    deadlineReminders: true,
    readyNotifications: true,
    promotions: false,
  },
  createdAt: "2024-01-15T00:00:00Z",
};

export const institutions = [
  { id: "uon", name: "University of Nairobi", campuses: ["Main campus", "Kikuyu campus", "Parklands"] },
  { id: "ku", name: "Kenyatta University", campuses: ["Main campus", "Nairobi campus"] },
  { id: "jkuat", name: "JKUAT", campuses: ["Main campus", "Nairobi CBD"] },
  { id: "strathmore", name: "Strathmore University", campuses: ["Main campus", "Madaraka"] },
];

export const getUserInitials = (name) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};