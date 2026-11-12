/**
 * One service per feature. Every function is async, typed, and goes through a
 * Transport, so it behaves the same against the mock server and a real backend.
 * UI code imports these services only: never mock data, never fetch.
 */
import type * as T from "../types";
import type { SessionStore } from "./session";
import type { QueryValue, Transport } from "./transport";

type Query = Record<string, QueryValue>;
const q = (params: object | undefined): Query => ({ ...(params as Query | undefined) });
const id = (value: string): string => encodeURIComponent(value);

export function createAuthApi(t: Transport, session: SessionStore) {
  const start = async (path: string, body: unknown): Promise<T.AuthSession> => {
    const result = await t<T.AuthSession>({ method: "POST", path, body, anonymous: true });
    await session.set(result);
    return result;
  };
  return {
    login: (dto: T.LoginDto) => start("/auth/login", dto),
    register: (dto: T.RegisterDto) => start("/auth/register", dto),
    async logout(): Promise<void> {
      try {
        await t<void>({ method: "POST", path: "/auth/logout" });
      } finally {
        await session.set(null);
      }
    },
    /** Restores the persisted session (if any) and returns its user. */
    async restore(): Promise<T.User | null> {
      await session.hydrate();
      return session.get()?.user ?? null;
    },
    async me(): Promise<T.User> {
      const user = await t<T.User>({ method: "GET", path: "/auth/me" });
      await session.updateUser(user);
      return user;
    },
    async updateProfile(dto: T.UpdateProfileDto): Promise<T.User> {
      const user = await t<T.User>({ method: "PATCH", path: "/auth/me", body: dto });
      await session.updateUser(user);
      return user;
    },
    myTeam: () => t<T.Team | null>({ method: "GET", path: "/me/team" }),
    async saveTeam(dto: T.UpsertTeamDto): Promise<T.Team> {
      const team = await t<T.Team>({ method: "PUT", path: "/me/team", body: dto });
      const current = session.get()?.user;
      if (current && current.teamId !== team.id) await session.updateUser({ ...current, teamId: team.id });
      return team;
    },
    onChange: (listener: (user: T.User | null) => void) => session.subscribe((s) => listener(s?.user ?? null)),
  };
}

export interface TeamProfile {
  team: T.Team;
  captainName: string;
  reviews: T.Review[];
}

export function createVenuesApi(t: Transport) {
  return {
    list: (params?: T.VenueListQuery) => t<T.Paginated<T.VenueSummary>>({ method: "GET", path: "/venues", query: q(params) }),
    /** Accepts a venue id or slug. */
    get: (idOrSlug: string) => t<T.VenueDetail>({ method: "GET", path: `/venues/${id(idOrSlug)}` }),
    availability: (fieldId: string, date: string) => t<T.Availability>({ method: "GET", path: `/fields/${id(fieldId)}/availability`, query: { date } }),
    weather: (province: T.Province, date: string) => t<T.WeatherHint>({ method: "GET", path: "/weather", query: { province, date } }),
    setFavorite: (venueId: string, favorite: boolean) => t<{ venueId: string; isFavorite: boolean }>({ method: favorite ? "PUT" : "DELETE", path: `/favorites/${id(venueId)}` }),
    report: (dto: T.CreateReportDto) => t<{ id: string }>({ method: "POST", path: "/reports", body: dto }),
  };
}

export function createBookingsApi(t: Transport) {
  return {
    quote: (dto: T.QuoteDto) => t<T.PriceBreakdown>({ method: "POST", path: "/bookings/quote", body: dto }),
    create: (dto: T.CreateBookingDto) => t<T.BookingDetail>({ method: "POST", path: "/bookings", body: dto }),
    list: (params?: T.BookingListQuery) => t<T.Paginated<T.BookingDetail>>({ method: "GET", path: "/bookings", query: q(params) }),
    get: (bookingId: string) => t<T.BookingDetail>({ method: "GET", path: `/bookings/${id(bookingId)}` }),
    cancel: (bookingId: string) => t<T.BookingDetail>({ method: "POST", path: `/bookings/${id(bookingId)}/cancel` }),
    reschedule: (bookingId: string, dto: T.RescheduleBookingDto) => t<T.BookingDetail>({ method: "POST", path: `/bookings/${id(bookingId)}/reschedule`, body: dto }),
  };
}

export function createMatchesApi(t: Transport) {
  return {
    list: (params?: T.MatchListQuery) => t<T.Paginated<T.MatchRequestDetail>>({ method: "GET", path: "/matches", query: q(params) }),
    get: (matchId: string) => t<T.MatchRequestDetail>({ method: "GET", path: `/matches/${id(matchId)}` }),
    create: (dto: T.CreateMatchDto) => t<T.MatchRequestDetail>({ method: "POST", path: "/matches", body: dto }),
    join: (matchId: string, message: string) => t<T.MatchRequestDetail>({ method: "POST", path: `/matches/${id(matchId)}/join`, body: { message } }),
    withdraw: (matchId: string) => t<T.MatchRequestDetail>({ method: "DELETE", path: `/matches/${id(matchId)}/join` }),
    decide: (matchId: string, requestId: string, decision: "accept" | "decline") =>
      t<T.MatchRequestDetail>({ method: "POST", path: `/matches/${id(matchId)}/requests/${id(requestId)}/decision`, body: { decision } }),
    cancel: (matchId: string) => t<T.MatchRequestDetail>({ method: "POST", path: `/matches/${id(matchId)}/cancel` }),
    team: (teamId: string) => t<TeamProfile>({ method: "GET", path: `/teams/${id(teamId)}` }),
  };
}

export function createChatApi(t: Transport) {
  return {
    list: () => t<T.Conversation[]>({ method: "GET", path: "/conversations" }),
    get: (conversationId: string) => t<T.ConversationDetail>({ method: "GET", path: `/conversations/${id(conversationId)}` }),
    startWithVenue: (venueId: string) => t<T.ConversationDetail>({ method: "POST", path: "/conversations", body: { venueId } }),
    send: (conversationId: string, body: string) => t<T.Message>({ method: "POST", path: `/conversations/${id(conversationId)}/messages`, body: { body } }),
    markRead: (conversationId: string) => t<void>({ method: "POST", path: `/conversations/${id(conversationId)}/read` }),
  };
}

export function createReviewsApi(t: Transport) {
  return {
    list: (params?: T.ReviewListQuery) => t<T.Paginated<T.Review>>({ method: "GET", path: "/reviews", query: q(params) }),
    create: (dto: T.CreateReviewDto) => t<T.Review>({ method: "POST", path: "/reviews", body: dto }),
  };
}

export function createNotificationsApi(t: Transport) {
  return {
    list: () => t<T.Notification[]>({ method: "GET", path: "/notifications" }),
    markRead: (notificationId: string) => t<T.Notification>({ method: "POST", path: `/notifications/${id(notificationId)}/read` }),
    markAllRead: () => t<void>({ method: "POST", path: "/notifications/read-all" }),
  };
}

export interface OwnerSchedule {
  date: string;
  open: string;
  close: string;
  closed: boolean;
  fields: T.Field[];
  bookings: T.BookingDetail[];
  blocks: T.AvailabilityBlock[];
}

export function createOwnerApi(t: Transport) {
  return {
    venues: () => t<T.VenueDetail[]>({ method: "GET", path: "/owner/venues" }),
    createVenue: (dto: T.UpsertVenueDto) => t<T.VenueDetail>({ method: "POST", path: "/owner/venues", body: dto }),
    updateVenue: (venueId: string, dto: T.UpsertVenueDto) => t<T.VenueDetail>({ method: "PATCH", path: `/owner/venues/${id(venueId)}`, body: dto }),
    createField: (venueId: string, dto: T.UpsertFieldDto) => t<T.Field>({ method: "POST", path: `/owner/venues/${id(venueId)}/fields`, body: dto }),
    updateField: (fieldId: string, dto: T.UpsertFieldDto) => t<T.Field>({ method: "PATCH", path: `/owner/fields/${id(fieldId)}`, body: dto }),
    deleteField: (fieldId: string) => t<void>({ method: "DELETE", path: `/owner/fields/${id(fieldId)}` }),
    bookings: (params?: T.OwnerBookingListQuery) => t<T.Paginated<T.BookingDetail>>({ method: "GET", path: "/owner/bookings", query: q(params) }),
    decideBooking: (bookingId: string, decision: "accept" | "reject") => t<T.BookingDetail>({ method: "POST", path: `/owner/bookings/${id(bookingId)}/decision`, body: { decision } }),
    schedule: (venueId: string, date: string) => t<OwnerSchedule>({ method: "GET", path: "/owner/schedule", query: { venueId, date } }),
    createBlock: (dto: T.CreateBlockDto) => t<T.AvailabilityBlock>({ method: "POST", path: "/owner/blocks", body: dto }),
    deleteBlock: (blockId: string) => t<void>({ method: "DELETE", path: `/owner/blocks/${id(blockId)}` }),
    earnings: () => t<T.OwnerEarnings>({ method: "GET", path: "/owner/earnings" }),
  };
}

export function createAdminApi(t: Transport) {
  return {
    analytics: () => t<T.AdminAnalytics>({ method: "GET", path: "/admin/analytics" }),
    venues: (params?: T.AdminVenueListQuery) => t<T.Paginated<T.VenueDetail>>({ method: "GET", path: "/admin/venues", query: q(params) }),
    moderateVenue: (venueId: string, dto: T.ModerateVenueDto) => t<T.VenueDetail>({ method: "POST", path: `/admin/venues/${id(venueId)}/moderate`, body: dto }),
    featureVenue: (venueId: string, featured: boolean) => t<T.VenueDetail>({ method: "POST", path: `/admin/venues/${id(venueId)}/feature`, body: { featured } }),
    users: (params?: T.AdminUserListQuery) => t<T.Paginated<T.User>>({ method: "GET", path: "/admin/users", query: q(params) }),
    setUserStatus: (userId: string, status: T.UserStatus) => t<T.User>({ method: "PATCH", path: `/admin/users/${id(userId)}/status`, body: { status } }),
    reports: (params?: { status?: T.Report["status"]; page?: number; pageSize?: number }) => t<T.Paginated<T.Report>>({ method: "GET", path: "/admin/reports", query: q(params) }),
    resolveReport: (reportId: string, dto: T.ResolveReportDto) => t<T.Report>({ method: "POST", path: `/admin/reports/${id(reportId)}/resolve`, body: dto }),
  };
}
