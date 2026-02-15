import { CreatePollForm } from "@/components/CreatePollForm";
import { BarChart3 } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-background via-background to-secondary/50 flex flex-col items-center justify-center p-4 md:p-8">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/5 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative z-10 w-full max-w-4xl space-y-12">
        <div className="text-center space-y-4 animate-in-up">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-white shadow-xl shadow-primary/10 mb-6">
            <BarChart3 className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-foreground via-foreground to-foreground/70">
            Real-Time Poll Rooms
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto font-light">
            Create instant polls, share with a link, and watch results update live. No registration required.
          </p>
        </div>

        <div className="animate-in-up" style={{ animationDelay: '150ms' }}>
          <CreatePollForm />
        </div>
        
        <footer className="text-center text-sm text-muted-foreground pt-12 pb-6">
          <p>Built for speed and simplicity. Secure and fair voting.</p>
        </footer>
      </div>
    </div>
  );
}
