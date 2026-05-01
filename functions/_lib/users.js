const USER_PREFIX = 'user:';

export function getUsersStore(env) {
  const kv = env.USERS;
  if (!kv || typeof kv.get !== 'function' || typeof kv.put !== 'function') {
    return null;
  }

  return {
    async get(email) {
      return kv.get(`${USER_PREFIX}${email}`, 'json');
    },

    async set(email, data) {
      await kv.put(`${USER_PREFIX}${email}`, JSON.stringify(data));
    },

    async setByKey(key, data) {
      await kv.put(key, JSON.stringify(data));
    },

    async findByStripeCustomerId(customerId) {
      let cursor;
      do {
        const page = await kv.list({ prefix: USER_PREFIX, cursor });
        for (const key of page.keys || []) {
          const user = await kv.get(key.name, 'json');
          if (user && user.stripeCustomerId === customerId) {
            return { key: key.name, user };
          }
        }
        cursor = page.list_complete ? undefined : page.cursor;
      } while (cursor);
      return null;
    },
  };
}
