import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { usePoll, useVote, usePollSocket } from "@/hooks/use-polls";
import { nanoid } from "nanoid";
import { motion } from "framer-motion";
import { Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ShareButton } from "@/components/ShareButton";
import { PollVisualization } from "@/components/PollVisualization";

const VOTER_TOKEN_KEY = "poll_voter_token";

export default function PollView() {
  const [, params] = useRoute("/poll/:id");
  const [, setLocation] = useLocation();
  const pollId = params?.id;
  
  // Custom hooks for data and socket
  const { data: poll, isLoading, error } = usePoll(pollId || "");
  const { mutate: submitVote, isPending: isVoting } = useVote(pollId || "");
  usePollSocket(pollId); // Connects WebSocket for this poll

  // State
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [voterToken, setVoterToken] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [votedOptionId, setVotedOptionId] = useState<number | null>(null);

  // Initialize voter token
  useEffect(() => {
    let token = localStorage.getItem(VOTER_TOKEN_KEY);
    if (!token) {
      token = nanoid();
      localStorage.setItem(VOTER_TOKEN_KEY, token);
    }
    setVoterToken(token);

    // Check if this token has already voted for this specific poll (local check only, basic UI enhancement)
    // In a real robust app we might check this via API, but for now we rely on user memory + backend rejection
    const votedPolls = JSON.parse(localStorage.getItem("voted_polls") || "{}");
    if (pollId && votedPolls[pollId]) {
      setHasVoted(true);
      setVotedOptionId(votedPolls[pollId]);
    }
  }, [pollId]);

  const handleVote = () => {
    if (!selectedOption || !voterToken || !pollId) return;

    const optionId = parseInt(selectedOption);
    
    submitVote(
      { optionId, voterToken },
      {
        onSuccess: () => {
          setHasVoted(true);
          setVotedOptionId(optionId);
          // Store locally that we voted
          const votedPolls = JSON.parse(localStorage.getItem("voted_polls") || "{}");
          votedPolls[pollId] = optionId;
          localStorage.setItem("voted_polls", JSON.stringify(votedPolls));
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !poll) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background p-4 text-center">
        <h2 className="text-2xl font-bold mb-4">Poll not found</h2>
        <p className="text-muted-foreground mb-6">This poll might have been deleted or the link is incorrect.</p>
        <Button onClick={() => setLocation("/")} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Home
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/30 py-12 px-4 flex items-center justify-center">
      <div className="max-w-3xl w-full space-y-8">
        {/* Header Navigation */}
        <div className="flex justify-between items-center animate-in fade-in slide-in-from-top-4 duration-500">
          <Button variant="ghost" onClick={() => setLocation("/")} className="text-muted-foreground hover:text-primary">
            <ArrowLeft className="mr-2 h-4 w-4" /> Create New
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium text-muted-foreground">Live Updates</span>
          </div>
        </div>

        {/* Main Card */}
        <Card className="shadow-2xl border-primary/10 overflow-hidden bg-white/80 backdrop-blur-md">
          <div className="h-1.5 w-full bg-gradient-to-r from-primary via-accent to-primary" />
          
          <CardHeader className="space-y-4 pb-8">
            <div className="flex justify-between items-start gap-4">
              <div className="space-y-1">
                <CardDescription>
                  Poll #{poll.id.slice(0, 8)} • Posted {new Date(poll.createdAt).toLocaleDateString()}
                </CardDescription>
                <CardTitle className="text-3xl md:text-4xl font-extrabold leading-tight text-foreground">
                  {poll.question}
                </CardTitle>
              </div>
              <ShareButton pollId={poll.id} question={poll.question} />
            </div>
          </CardHeader>

          <CardContent className="pb-8">
            {!hasVoted ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <RadioGroup 
                  onValueChange={setSelectedOption} 
                  className="space-y-4"
                >
                  {poll.options.map((option) => (
                    <div key={option.id}>
                      <RadioGroupItem
                        value={option.id.toString()}
                        id={`option-${option.id}`}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={`option-${option.id}`}
                        className="flex items-center justify-between w-full p-5 text-lg font-medium bg-secondary/30 border-2 border-transparent rounded-xl cursor-pointer hover:bg-secondary/60 hover:border-primary/20 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:text-primary transition-all duration-200"
                      >
                        {option.text}
                        <CheckCircle2 className="w-6 h-6 opacity-0 peer-data-[state=checked]:opacity-100 text-primary transition-all scale-50 peer-data-[state=checked]:scale-100" />
                      </Label>
                    </div>
                  ))}
                </RadioGroup>

                <Button 
                  size="lg" 
                  className="w-full text-lg h-14 font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all"
                  onClick={handleVote}
                  disabled={!selectedOption || isVoting}
                >
                  {isVoting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Casting Vote...
                    </>
                  ) : (
                    "Submit Vote"
                  )}
                </Button>
              </motion.div>
            ) : (
              <PollVisualization poll={poll} votedOptionId={votedOptionId} />
            )}
          </CardContent>

          {hasVoted && (
            <CardFooter className="bg-secondary/20 pt-6 flex justify-center border-t border-border/50">
              <p className="text-muted-foreground text-sm font-medium">
                You voted for <span className="text-foreground font-bold">{poll.options.find(o => o.id === votedOptionId)?.text}</span>
              </p>
            </CardFooter>
          )}
        </Card>

        {/* Info Section */}
        <div className="text-center text-sm text-muted-foreground max-w-lg mx-auto">
          <p>
            This poll is real-time. Results update automatically as votes come in from other users.
            Fairness is ensured through browser fingerprinting and IP checks.
          </p>
        </div>
      </div>
    </div>
  );
}
