// Runs once per server start, before the first request is handled.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { setUpEmptyDatabase } = await import("./db/setup");
    try {
      await setUpEmptyDatabase();
    } catch (error) {
      // A failed register leaves Next running but answering every request with a 500.
      // Exiting lets the host restart the app and try again once the database is up.
      console.error("Database setup failed:", error);
      process.exit(1);
    }
  }
}
