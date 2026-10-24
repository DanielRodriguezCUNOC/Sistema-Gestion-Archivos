import { Types } from "mongoose";

export interface UserProfile {
  _id: Types.ObjectId | string;
  name?: string;
  email?: string;
  avatarUrl?: string;
}