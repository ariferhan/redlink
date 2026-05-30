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

  async function getCurrentAccountDirectory() {
    const user = await getUser();

    if (!client || !user) {
      return null;
    }

    let { data, error } = await client
      .from("account_directory")
      .select("id, email, role, created_at, updated_at")
      .eq("id", user.id)
      .single();

    if (error || !data) {
      await ensureCurrentAccountDirectory();
      const retry = await client
        .from("account_directory")
        .select("id, email, role, created_at, updated_at")
        .eq("id", user.id)
        .single();
      data = retry.data;
    }

    return data;
  }

  async function ensureCurrentAccountDirectory() {
    if (!client) {
      return false;
    }

    const { error } = await client.rpc("ensure_current_account_directory");
    return !error;
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

  async function getCurrentRole() {
    const account = await getCurrentAccountDirectory();
    return account?.role || "member";
  }

  async function isCurrentAdmin() {
    return (await getCurrentRole()) === "admin";
  }

  async function canCurrentManageBlogs() {
    const role = await getCurrentRole();
    return role === "admin" || role === "editor";
  }

  async function listPublishedBlogs(limit = 12) {
    if (!client) {
      return [];
    }

    const { data, error } = await client
      .from("blog_posts")
      .select("*")
      .eq("is_published", true)
      .order("published_at", { ascending: false })
      .limit(limit);

    if (error) {
      return [];
    }

    return data || [];
  }

  async function listBlogsForAdmin() {
    if (!client) {
      return [];
    }

    const admin = await canCurrentManageBlogs();

    if (!admin) {
      return [];
    }

    const { data, error } = await client.from("blog_posts").select("*").order("published_at", { ascending: false });

    if (error) {
      return [];
    }

    return data || [];
  }

  async function getBlogBySlug(slug) {
    if (!client) {
      return null;
    }

    const admin = await canCurrentManageBlogs();
    let query = client.from("blog_posts").select("*").eq("slug", slug).limit(1);

    if (!admin) {
      query = query.eq("is_published", true);
    }

    const { data, error } = await query.single();

    if (error) {
      return null;
    }

    return data;
  }

  async function saveBlog(post) {
    if (!client) {
      return { ok: false, message: "Supabase yapılandırılmamış." };
    }

    const admin = await canCurrentManageBlogs();

    if (!admin) {
      return { ok: false, message: "Blog yönetimi için admin veya editör rolü gerekiyor." };
    }

    const payload = {
      id: post.id,
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      cover_image: post.coverImage || "",
      published_at: post.publishedAt,
      is_published: Boolean(post.isPublished),
      author_username: post.authorUsername || "admin",
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await client.from("blog_posts").upsert(payload).select("*").single();

    if (error) {
      return { ok: false, message: error.message };
    }

    return {
      ok: true,
      post: {
        id: data.id,
        slug: data.slug,
        title: data.title,
        excerpt: data.excerpt,
        content: data.content,
        coverImage: data.cover_image || "",
        publishedAt: data.published_at,
        isPublished: data.is_published,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        authorUsername: data.author_username,
      },
    };
  }

  async function deleteBlog(id) {
    if (!client) {
      return { ok: false, message: "Supabase yapılandırılmamış." };
    }

    const admin = await canCurrentManageBlogs();

    if (!admin) {
      return { ok: false, message: "Blog yönetimi için admin veya editör rolü gerekiyor." };
    }

    const { error } = await client.from("blog_posts").delete().eq("id", id);

    if (error) {
      return { ok: false, message: error.message };
    }

    return { ok: true };
  }

  async function listAccountsForAdmin() {
    if (!client) {
      return { ok: false, message: "Supabase yapılandırılmamış.", users: [] };
    }

    const admin = await isCurrentAdmin();

    if (!admin) {
      return { ok: false, message: "Bu alan için admin rolü gerekiyor.", users: [] };
    }

    await client.rpc("sync_account_directory");

    const { data: accounts, error: accountError } = await client
      .from("account_directory")
      .select("id, email, role, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (accountError) {
      return { ok: false, message: accountError.message, users: [] };
    }

    const { data: profiles, error: profileError } = await client
      .from("profiles")
      .select("id, username, display_name");

    if (profileError) {
      return { ok: false, message: profileError.message, users: [] };
    }

    const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]));
    const users = (accounts || []).map((account) => {
      const profile = profileMap.get(account.id);
      return {
        id: account.id,
        email: account.email,
        role: account.role,
        username: profile?.username || account.email?.split("@")[0] || "",
        displayName: profile?.display_name || profile?.username || account.email?.split("@")[0] || "Kullanıcı",
        created_at: account.created_at,
        updated_at: account.updated_at,
      };
    });

    return { ok: true, users };
  }

  async function updateAccountRole(userId, role) {
    if (!client) {
      return { ok: false, message: "Supabase yapılandırılmamış." };
    }

    const admin = await isCurrentAdmin();
    const currentUser = await getUser();

    if (!admin) {
      return { ok: false, message: "Rol düzenlemek için admin olman gerekiyor." };
    }

    if (currentUser?.id === userId && role !== "admin") {
      return { ok: false, message: "Kendi admin rolünü bu ekrandan düşüremezsin." };
    }

    const { data, error } = await client
      .from("account_directory")
      .update({
        role,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .select("id, email, role, created_at, updated_at")
      .single();

    if (error) {
      return { ok: false, message: error.message };
    }

    return { ok: true, user: data };
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
    getCurrentAccountDirectory,
    ensureCurrentAccountDirectory,
    saveProfile,
    getCurrentRole,
    listPublishedBlogs,
    listBlogsForAdmin,
    getBlogBySlug,
    saveBlog,
    deleteBlog,
    listAccountsForAdmin,
    updateAccountRole,
  };
})();
