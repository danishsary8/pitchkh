/**
 * Domain types. Every type is inferred from its zod schema in ../schemas so the
 * runtime validation and the compile-time types can never drift apart.
 * Schemas and types share names; import values as `schemas.X`, types as `X`.
 */
import type { z } from "zod";
import type * as s from "../schemas";

export type Id = string;
export type Sport = z.infer<typeof s.Sport>;
export type MatchSport = z.infer<typeof s.MatchSport>;
export type Role = z.infer<typeof s.Role>;
export type Locale = z.infer<typeof s.Locale>;
export type Province = z.infer<typeof s.Province>;
export type PaymentMethod = z.infer<typeof s.PaymentMethod>;
export type SkillLevel = z.infer<typeof s.SkillLevel>;
export type PageMeta = z.infer<typeof s.PageMeta>;
export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}

export type User = z.infer<typeof s.User>;
export type UserStatus = z.infer<typeof s.UserStatus>;
export type Team = z.infer<typeof s.Team>;
export type LoginDto = z.infer<typeof s.LoginDto>;
export type RegisterDto = z.infer<typeof s.RegisterDto>;
export type AuthSession = z.infer<typeof s.AuthSession>;
export type UpdateProfileDto = z.infer<typeof s.UpdateProfileDto>;
export type UpsertTeamDto = z.input<typeof s.UpsertTeamDto>;

export type Amenity = z.infer<typeof s.Amenity>;
export type OpeningHours = z.infer<typeof s.OpeningHours>;
export type Venue = z.infer<typeof s.Venue>;
export type VenueStatus = z.infer<typeof s.VenueStatus>;
export type VenueSummary = z.infer<typeof s.VenueSummary>;
export type VenueDetail = z.infer<typeof s.VenueDetail>;
export type VenueListQuery = z.input<typeof s.VenueListQuery>;
export type VenueSort = (typeof s.VENUE_SORTS)[number];
export type UpsertVenueDto = z.input<typeof s.UpsertVenueDto>;
export type ModerateVenueDto = z.infer<typeof s.ModerateVenueDto>;

export type Surface = z.infer<typeof s.Surface>;
export type Field = z.infer<typeof s.Field>;
export type UpsertFieldDto = z.input<typeof s.UpsertFieldDto>;
export type VenueAvailability = z.infer<typeof s.VenueAvailability>;
export type FieldLayout = z.infer<typeof s.FieldLayout>;
export type TelegramStatus = z.infer<typeof s.TelegramStatus>;
export type PaymentIntent = z.infer<typeof s.PaymentIntent>;
export type ForgotPasswordResult = z.infer<typeof s.ForgotPasswordResult>;
export type ResetPasswordDto = z.infer<typeof s.ResetPasswordDto>;
export type SaveLayoutDto = z.infer<typeof s.SaveLayoutDto>;

export type Extras = z.infer<typeof s.Extras>;
export type PriceLine = z.infer<typeof s.PriceLine>;
export type PriceBreakdown = z.infer<typeof s.PriceBreakdown>;
export type BookingStatus = z.infer<typeof s.BookingStatus>;
export type PaymentStatus = z.infer<typeof s.PaymentStatus>;
export type OpponentMode = z.infer<typeof s.OpponentMode>;
export type Booking = z.infer<typeof s.Booking>;
export type BookingDetail = z.infer<typeof s.BookingDetail>;
export type CreateBookingDto = z.input<typeof s.CreateBookingDto>;
export type QuoteDto = z.infer<typeof s.QuoteDto>;
export type RescheduleBookingDto = z.infer<typeof s.RescheduleBookingDto>;
export type BookingListQuery = z.input<typeof s.BookingListQuery>;
export type OwnerBookingListQuery = z.input<typeof s.OwnerBookingListQuery>;
export type Slot = z.infer<typeof s.Slot>;
export type SlotStatus = z.infer<typeof s.SlotStatus>;
export type Availability = z.infer<typeof s.Availability>;
export type AvailabilityBlock = z.infer<typeof s.AvailabilityBlock>;
export type CreateBlockDto = z.input<typeof s.CreateBlockDto>;

export type CostSplit = z.infer<typeof s.CostSplit>;
export type MatchStatus = z.infer<typeof s.MatchStatus>;
export type JoinStatus = z.infer<typeof s.JoinStatus>;
export type MatchRequest = z.infer<typeof s.MatchRequest>;
export type MatchRequestDetail = z.infer<typeof s.MatchRequestDetail>;
export type JoinRequest = z.infer<typeof s.JoinRequest>;
export type JoinRequestDetail = z.infer<typeof s.JoinRequestDetail>;
export type MatchListQuery = z.input<typeof s.MatchListQuery>;
export type CreateMatchDto = z.input<typeof s.CreateMatchDto>;

export type Message = z.infer<typeof s.Message>;
export type Conversation = z.infer<typeof s.Conversation>;
export type ConversationDetail = z.infer<typeof s.ConversationDetail>;

export type Review = z.infer<typeof s.Review>;
export type CreateReviewDto = z.input<typeof s.CreateReviewDto>;
export type ReviewListQuery = z.input<typeof s.ReviewListQuery>;
export type Notification = z.infer<typeof s.Notification>;
export type NotificationType = Notification["type"];
export type Report = z.infer<typeof s.Report>;
export type CreateReportDto = z.input<typeof s.CreateReportDto>;
export type ResolveReportDto = z.input<typeof s.ResolveReportDto>;
export type WeatherHint = z.infer<typeof s.WeatherHint>;
export type WeatherCondition = z.infer<typeof s.WeatherCondition>;
export type OwnerEarnings = z.infer<typeof s.OwnerEarnings>;
export type AdminAnalytics = z.infer<typeof s.AdminAnalytics>;
export type AdminUserListQuery = z.input<typeof s.AdminUserListQuery>;
export type AdminVenueListQuery = z.input<typeof s.AdminVenueListQuery>;
