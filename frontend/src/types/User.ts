export interface User {
  _id: string;
  username: string;
  email: string;
  role: string;
  companyId?: string | { _id: string; name: string };
}
