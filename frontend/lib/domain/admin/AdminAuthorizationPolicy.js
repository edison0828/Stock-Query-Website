export class AdminAuthorizationPolicy {
  constructor(session) {
    this.session = session;
  }

  isAuthenticated() {
    return Boolean(this.session?.user);
  }

  isAdmin() {
    return this.session?.user?.role === "admin";
  }

  assertAdmin() {
    if (!this.isAuthenticated()) {
      const error = new Error("請先登入");
      error.status = 401;
      throw error;
    }

    if (!this.isAdmin()) {
      const error = new Error("需要管理員權限");
      error.status = 403;
      throw error;
    }
  }
}
