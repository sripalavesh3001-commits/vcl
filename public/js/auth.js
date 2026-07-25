// Login/signup UI has been removed. This just loads the single built-in
// demo user so the rest of the app (which expects Auth.user) keeps working.
const Auth = {
  user: null,

  async init() {
    try {
      const { user } = await API.get('/auth/me');
      this.user = user;
      return true;
    } catch (e) {
      this.user = null;
      return false;
    }
  }
};
