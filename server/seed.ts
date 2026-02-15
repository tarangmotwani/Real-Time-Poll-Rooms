import { storage } from "./storage";

export async function seedDatabase() {
  try {
    // Check if any polls exist
    // We don't have a count method on storage, so we'll just try to get a known ID or skip
    // Better yet, just create one if we want.
    // For now, let's create a sample poll if it's empty.
    
    // Since we don't have a "list polls" method in storage for this simple app,
    // we can just create a new one every time or just let the user create one.
    // However, to be helpful, let's create a "Welcome Poll".
    
    // We can't easily check if DB is empty without a list method.
    // Let's just create one and log the ID.
    
    const pollId = await storage.createPoll({
      question: "What is your favorite programming language?",
      options: ["TypeScript", "Python", "Rust", "Go", "Java"],
    });
    
    console.log(`Seeded poll created with ID: ${pollId}`);
    
    // Add some votes to it for visualization
    const options = (await storage.getPoll(pollId))?.options;
    if (options) {
      await storage.addVote(pollId, { optionId: options[0].id, voterToken: "seed-1" }, "127.0.0.1");
      await storage.addVote(pollId, { optionId: options[1].id, voterToken: "seed-2" }, "127.0.0.2");
      await storage.addVote(pollId, { optionId: options[0].id, voterToken: "seed-3" }, "127.0.0.3");
    }

  } catch (error) {
    console.error("Error seeding database:", error);
  }
}
