export type ClientUser = {
  id: string;
  username: string;
  normalizedUsername: string;
  tenantDomain?: string;
  firstName: string;
  lastName: string | null;
  fullName: string;
  picture: string | null;
  birthdate: Date | null;
  gender: "male" | "female" | "custom" | "not_specified";
  genderCustom: string | null;
  pronouns: "male" | "female" | "other";
  passwordBreaches: number | null;
  passwordChangedAt: Date | null;
  hasOtp: boolean;
  timeZone: string;
  locale: string;

  email: string | null;
  tenant: string | null;
  tenantId: string | null;
};
