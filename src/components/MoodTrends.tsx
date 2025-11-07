import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { Smile, TrendingUp } from "lucide-react";

interface MoodEntry {
  id: string;
  mood: string;
  intensity: number;
  created_at: string;
  note: string | null;
}

export const MoodTrends = () => {
  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMoodEntries();
  }, []);

  const fetchMoodEntries = async () => {
    const { data, error } = await supabase
      .from("mood_entries")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching mood entries:", error);
    } else {
      setMoodEntries(data || []);
    }
    setIsLoading(false);
  };

  const chartData = moodEntries.map((entry) => ({
    date: format(new Date(entry.created_at), "MMM d"),
    intensity: entry.intensity,
    mood: entry.mood,
  }));

  const moodCounts = moodEntries.reduce((acc, entry) => {
    acc[entry.mood] = (acc[entry.mood] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const averageIntensity =
    moodEntries.length > 0
      ? (moodEntries.reduce((sum, entry) => sum + (entry.intensity || 0), 0) / moodEntries.length).toFixed(1)
      : 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center h-64">
              <div className="animate-pulse text-muted-foreground">Loading mood data...</div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (moodEntries.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Smile className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No mood entries yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Start logging your mood before conversations to see trends
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Average Intensity
            </CardTitle>
            <CardDescription>Overall mood intensity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{averageIntensity}/10</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Most Common Mood</CardTitle>
            <CardDescription>Your frequent emotional state</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(moodCounts)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 3)
                .map(([mood, count]) => (
                  <div key={mood} className="flex justify-between items-center">
                    <span className="capitalize">{mood}</span>
                    <span className="text-muted-foreground">{count} times</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mood Intensity Over Time</CardTitle>
          <CardDescription>Track how your emotional intensity changes</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                className="text-xs"
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis 
                domain={[0, 10]} 
                className="text-xs"
                stroke="hsl(var(--muted-foreground))"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Line
                type="monotone"
                dataKey="intensity"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: "hsl(var(--primary))" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Mood Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {moodEntries
              .slice(-5)
              .reverse()
              .map((entry) => (
                <div
                  key={entry.id}
                  className="flex justify-between items-start p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="capitalize font-medium">{entry.mood}</span>
                      <span className="text-sm text-muted-foreground">
                        Intensity: {entry.intensity}/10
                      </span>
                    </div>
                    {entry.note && (
                      <p className="text-sm text-muted-foreground">{entry.note}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                    {format(new Date(entry.created_at), "MMM d, h:mm a")}
                  </span>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
