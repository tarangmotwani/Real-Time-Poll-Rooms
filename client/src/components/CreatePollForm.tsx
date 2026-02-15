import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { Plus, Trash2, Loader2, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { useCreatePoll } from "@/hooks/use-polls";
import { createPollSchema, type CreatePollRequest } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export function CreatePollForm() {
  const [, setLocation] = useLocation();
  const { mutate, isPending } = useCreatePoll();
  
  const form = useForm<CreatePollRequest>({
    resolver: zodResolver(createPollSchema),
    defaultValues: {
      question: "",
      options: ["", ""], // Start with 2 empty options
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "options" as never, // Type casting due to simple array structure
  });

  function onSubmit(data: CreatePollRequest) {
    mutate(data, {
      onSuccess: (res) => {
        setLocation(`/poll/${res.id}`);
      },
    });
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-2xl border-primary/10 bg-white/50 backdrop-blur-md overflow-hidden">
      <div className="h-2 bg-gradient-to-r from-primary to-accent w-full" />
      <CardHeader>
        <CardTitle className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-primary to-accent">
          Create a New Poll
        </CardTitle>
        <CardDescription className="text-lg">
          Ask a question and let the world decide in real-time.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="question"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold text-foreground/80">
                    Your Question
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., What's the best programming language?" 
                      className="text-lg py-6 px-4 bg-white/70 border-2 focus:border-primary/50 transition-all shadow-sm focus:shadow-md"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <FormLabel className="text-base font-semibold text-foreground/80">
                  Options
                </FormLabel>
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">
                  {fields.length} Items
                </span>
              </div>
              
              <AnimatePresence initial={false}>
                {fields.map((field, index) => (
                  <motion.div
                    key={field.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <FormField
                      control={form.control}
                      name={`options.${index}`}
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex gap-2">
                            <FormControl>
                              <Input 
                                placeholder={`Option ${index + 1}`} 
                                className="bg-white/70 border-input/60 focus:bg-white transition-all"
                                {...field} 
                              />
                            </FormControl>
                            {fields.length > 2 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => remove(index)}
                                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append("")}
                className="mt-2 w-full border-dashed border-2 hover:border-primary hover:text-primary transition-colors"
              >
                <Plus className="mr-2 h-4 w-4" /> Add Another Option
              </Button>
            </div>

            <Button 
              type="submit" 
              className="w-full py-6 text-lg font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all duration-300"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Creating...
                </>
              ) : (
                <>
                  Create Poll <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
