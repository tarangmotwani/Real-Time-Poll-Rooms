import { motion } from "framer-motion";
import { type PollWithOptions } from "@shared/schema";
import { Check } from "lucide-react";

interface PollVisualizationProps {
  poll: PollWithOptions;
  votedOptionId: number | null;
}

export function PollVisualization({ poll, votedOptionId }: PollVisualizationProps) {
  const totalVotes = poll.options.reduce((sum, opt) => sum + opt.count, 0);

  // Sort options by count descending for visualization clarity
  const sortedOptions = [...poll.options].sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end mb-4">
        <h3 className="text-xl font-bold text-foreground/80">Results</h3>
        <span className="text-sm font-medium px-3 py-1 bg-secondary rounded-full">
          {totalVotes} total votes
        </span>
      </div>

      <div className="space-y-4">
        {poll.options.map((option) => {
          const percentage = totalVotes === 0 ? 0 : Math.round((option.count / totalVotes) * 100);
          const isWinner = totalVotes > 0 && option.count === Math.max(...poll.options.map(o => o.count));
          const isVoted = option.id === votedOptionId;

          return (
            <div key={option.id} className="relative">
              {/* Label Row */}
              <div className="flex justify-between items-center mb-1.5 relative z-10 px-1">
                <span className={`font-medium flex items-center gap-2 ${isVoted ? "text-primary font-bold" : "text-foreground"}`}>
                  {option.text}
                  {isVoted && <Check className="w-4 h-4 text-primary" />}
                </span>
                <span className="font-bold tabular-nums text-foreground/70">
                  {percentage}% <span className="text-xs font-normal text-muted-foreground ml-1">({option.count})</span>
                </span>
              </div>

              {/* Bar Background */}
              <div className="h-12 w-full bg-secondary/50 rounded-xl overflow-hidden relative">
                {/* Fill Bar */}
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ type: "spring", stiffness: 50, damping: 15 }}
                  className={`h-full absolute left-0 top-0 rounded-xl ${
                    isVoted 
                      ? "bg-gradient-to-r from-primary to-accent" 
                      : isWinner 
                        ? "bg-primary/60" 
                        : "bg-muted-foreground/20"
                  }`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
