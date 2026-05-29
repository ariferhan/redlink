(function initializeSupabaseService() {
  const config = window.__SOJIAL_SUPABASE__ || {};
  const hasSupabaseLibrary = Boolean(window.supabase?.createClient);
  const hasConfig = Boolean(config.url && config.anonKey);
  const client = hasSupabaseLibrary && hasConfig ? window.supabase.createClient(config.url, config.anonKey) : null;

  async function getSession() {
    if (!client) {
      return null;
    }

    const { data, error } = await client.auth.getSession();
    if (error) {
      return null;
    }

    return data.session;
  }

  async function getUser() {
    if (!client) {
      return null;
    }

    const { data, error } = await client.auth.getUser();
    if (error) {
      return null;
    }

    return data.user;
  }

  async function signInWithEmail(email, password) {
    if (!client) {
      return { ok: false, message: "Supabase yapılandırılmamış." };
    }

    const { data, error } = await client.auth.signInWithPassword({ email, password });

    if (error) {
      return { ok: false, message: error.message };
    }

    return { ok: true, user: data.user };
  }

  async function verifyCurrentPassword(email, password) {
    if (!client) {
      return { ok: false, message: "Supabase yapılandırılmamış." };
    }

    const { error } = await client.auth.signInWithPassword({ email, password });

    if (error) {
      return { ok: false, message: "Mevcut şifre doğrulanamadı." };
    }

    return { ok: true };
  }

  async function sendEmailOtp({ email, shouldCreateUser = false, data = null }) {
    if (!client) {
      return { ok: false, message: "Supabase yapılandırılmamış." };
    }

    const payload = {
      email,
      options: {
        shouldCreateUser,
      },
    };

    if (data) {
      payload.options.data = data;
    }

    const { error } = await client.auth.signInWithOtp(payload);

    if (error) {
      return { ok: false, message: error.message };
    }

    return { ok: true };
  }

  async function verifyEmailOtp({ email, token }) {
    if (!client) {
      return { ok: false, message: "Supabase yapılandırılmamış." };
    }

    const {
      data: { user, session },
      error,
    } = await client.auth.verifyOtp({
      email,
      token,
      type: "email",
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    return { ok: true, user, session };
  }

  async function updateCurrentUser({ password, username, name, email }) {
    if (!client) {
      return { ok: false, message: "Supabase yapılandırılmamış." };
    }

    const payload = {
      data: {},
    };

    if (password) {
      payload.password = password;
    }

    if (email) {
      payload.email = email;
    }

    if (username) {
      payload.data.username = username;
    }

    if (name) {
      payload.data.full_name = name;
    }

    const { data, error } = await client.auth.updateUser(payload);

    if (error) {
      return { ok: false, message: error.message };
    }

    return { ok: true, user: data.user };
  }

  async function signUp({ email, password, username, name }) {
    if (!client) {
      return { ok: false, message: "Supabase yapılandırılmamış." };
    }

    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          full_name: name,
        },
      },
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    return { ok: true, user: data.user, session: data.session };
  }

  async function signOut() {
    if (!client) {
      return;
    }

    await client.auth.signOut();
  }

  async function getProfileByUsername(username) {
    if (!client) {
      return null;
    }

    const { data, error } = await client
      .from("profiles")
      .select(
        `
          id,
          username,
          display_name,
          avatar_letter,
          active_language,
          title_tr,
          title_en,
          title_de,
          bio_tr,
          bio_en,
          bio_de,
          dark_mode,
          profile_links (
            id,
            platform,
            label,
            url,
            icon,
            sort_order
          )
        `
      )
      .eq("username", username)
      .single();

    if (error) {
      return null;
    }

    return data;
  }

  async function getProfileForCurrentUser() {
    const user = await getUser();

    if (!client || !user) {
      return null;
    }

    const { data, error } = await client
      .from("profiles")
      .select(
        `
          id,
          username,
          display_name,
          avatar_letter,
          active_language,
          title_tr,
          title_en,
          title_de,
          bio_tr,
          bio_en,
          bio_de,
          dark_mode,
          profile_links (
            id,
            platform,
            label,
            url,
            icon,
            sort_order
          )
        `
      )
      .eq("id", user.id)
      .single();

    if (error) {
      return null;
    }

    return data;
  }

  async function saveProfile(profile) {
    const user = await getUser();

    if (!client || !user) {
      return { ok: false, message: "Aktif kullanıcı bulunamadı." };
    }

    const profilePayload = {
      id: user.id,
      username: profile.username || user.user_metadata?.username || user.email?.split("@")[0] || "profil",
      display_name: profile.name,
      avatar_letter: profile.avatarLetter,
      active_language: profile.activeLanguage,
      title_tr: profile.title.tr,
      title_en: profile.title.en,
      title_de: profile.title.de,
      bio_tr: profile.bio.tr,
      bio_en: profile.bio.en,
      bio_de: profile.bio.de,
      dark_mode: Boolean(profile.darkMode),
      updated_at: new Date().toISOString(),
    };

    const { error: profileError } = await client.from("profiles").upsert(profilePayload);

    if (profileError) {
      return { ok: false, message: profileError.message };
    }

    const { error: deleteError } = await client.from("profile_links").delete().eq("profile_id", user.id);

    if (deleteError) {
      return { ok: false, message: deleteError.message };
    }

    const linksPayload = (profile.links || []).map((link, index) => ({
      profile_id: user.id,
      platform: link.platform,
      label: link.label,
      url: link.url,
      icon: link.icon,
      sort_order: index,
    }));

    if (linksPayload.length > 0) {
      const { error: insertError } = await client.from("profile_links").insert(linksPayload);

      if (insertError) {
        return { ok: false, message: insertError.message };
      }
    }

    return { ok: true };
  }

  window.supabaseService = {
    isReady() {
      return Boolean(client);
    },
    client,
    getSession,
    getUser,
    signInWithEmail,
    verifyCurrentPassword,
    sendEmailOtp,
    verifyEmailOtp,
    updateCurrentUser,
    signUp,
    signOut,
    getProfileByUsername,
    getProfileForCurrentUser,
    saveProfile,
  };
})();
