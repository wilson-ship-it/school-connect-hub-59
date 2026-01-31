import { useState, useEffect, useRef, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Mic, MicOff, Volume2, VolumeX, Loader2, MessageSquare, Bot, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function VoiceAssistant() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  
  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Check browser support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition || !window.speechSynthesis) {
      setIsSupported(false);
      toast({
        variant: 'destructive',
        title: 'Browser not supported',
        description: 'Voice features require Chrome, Edge, or Safari.',
      });
    }
  }, [toast]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Fetch context for AI (scholarships, notices, fees)
  const fetchContext = useCallback(async () => {
    if (!profile?.school_code) return '';

    const [scholarshipsRes, noticesRes, feesRes] = await Promise.all([
      supabase
        .from('scholarships')
        .select('title, description, amount, deadline')
        .eq('school_code', profile.school_code)
        .limit(5),
      supabase
        .from('notices')
        .select('title, content, priority, created_at')
        .eq('school_code', profile.school_code)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('fees')
        .select('title, amount, due_date, category')
        .eq('school_code', profile.school_code)
        .limit(5),
    ]);

    let context = `User: ${profile.full_name}\nSchool Code: ${profile.school_code}\n\n`;

    if (scholarshipsRes.data?.length) {
      context += 'Recent Scholarships:\n';
      scholarshipsRes.data.forEach((s) => {
        context += `- ${s.title}: ${s.description || 'No description'}. Amount: $${s.amount || 'N/A'}. Deadline: ${s.deadline || 'N/A'}\n`;
      });
    }

    if (noticesRes.data?.length) {
      context += '\nRecent Notices:\n';
      noticesRes.data.forEach((n) => {
        context += `- ${n.title} (${n.priority || 'normal'} priority): ${n.content.substring(0, 100)}...\n`;
      });
    }

    if (feesRes.data?.length) {
      context += '\nFees:\n';
      feesRes.data.forEach((f) => {
        context += `- ${f.title}: $${f.amount}. Category: ${f.category || 'General'}. Due: ${f.due_date || 'N/A'}\n`;
      });
    }

    return context;
  }, [profile]);

  // Text-to-Speech
  const speak = useCallback((text: string) => {
    if (isMuted || !window.speechSynthesis) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    // Try to use a natural voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (v) => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural'))
    ) || voices.find((v) => v.lang.startsWith('en'));
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    synthesisRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [isMuted]);

  // Send message to AI
  const sendToAI = useCallback(async (userMessage: string) => {
    if (!userMessage.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsProcessing(true);

    try {
      const context = await fetchContext();
      
      const { data, error } = await supabase.functions.invoke('voice-assistant', {
        body: { message: userMessage, context },
      });

      if (error) throw error;

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      speak(data.response);
    } catch (error) {
      console.error('AI error:', error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsProcessing(false);
    }
  }, [fetchContext, speak]);

  // Start listening
  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    // Stop any ongoing speech
    window.speechSynthesis.cancel();
    setIsSpeaking(false);

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('');
    };

    recognition.onresult = (event) => {
      const current = event.resultIndex;
      const result = event.results[current];
      const transcriptText = result[0].transcript;
      
      setTranscript(transcriptText);

      if (result.isFinal) {
        sendToAI(transcriptText);
        setTranscript('');
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      if (event.error !== 'no-speech') {
        toast({
          variant: 'destructive',
          title: 'Voice error',
          description: 'Could not recognize speech. Please try again.',
        });
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [sendToAI, toast]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, []);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (!isMuted) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
    setIsMuted(!isMuted);
  }, [isMuted]);

  // Initial greeting
  useEffect(() => {
    if (messages.length === 0 && profile) {
      const greeting: Message = {
        id: 'greeting',
        role: 'assistant',
        content: `Hello ${profile.full_name?.split(' ')[0] || 'there'}! I'm your SchoolConnect voice assistant. I can help you with information about scholarships, fees, notices, and more. Just tap the microphone and ask me anything!`,
        timestamp: new Date(),
      };
      setMessages([greeting]);
    }
  }, [profile, messages.length]);

  if (!isSupported) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8">
          <Card className="text-center py-12">
            <CardContent>
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <MicOff className="h-8 w-8 text-destructive" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Voice Not Supported</h3>
              <p className="text-muted-foreground">
                Your browser doesn't support voice features. Please use Chrome, Edge, or Safari.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 h-[calc(100vh-4rem)] lg:h-screen flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <Mic className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold">Voice Assistant</h1>
              <p className="text-muted-foreground">
                Ask questions using your voice
              </p>
            </div>
          </div>
          <Button
            variant={isMuted ? 'destructive' : 'outline'}
            size="icon"
            onClick={toggleMute}
          >
            {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </Button>
        </div>

        {/* Chat Area */}
        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">Conversation</CardTitle>
              </div>
              {isProcessing && (
                <Badge variant="secondary" className="animate-pulse">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Thinking...
                </Badge>
              )}
              {isSpeaking && (
                <Badge variant="default" className="animate-pulse">
                  <Volume2 className="h-3 w-3 mr-1" />
                  Speaking...
                </Badge>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full px-6">
              <div className="space-y-4 py-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {message.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p className="text-xs opacity-60 mt-1">
                        {message.timestamp.toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                    {message.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 text-secondary-foreground" />
                      </div>
                    )}
                  </div>
                ))}
                
                {/* Live transcript */}
                {transcript && (
                  <div className="flex gap-3 justify-end">
                    <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-primary/50 text-primary-foreground">
                      <p className="text-sm italic">{transcript}...</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-secondary-foreground" />
                    </div>
                  </div>
                )}
                
                <div ref={scrollRef} />
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Voice Control */}
        <div className="mt-6 flex flex-col items-center gap-4">
          {isListening && (
            <div className="flex items-center gap-2 text-primary animate-pulse">
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              <span className="text-sm font-medium ml-2">Listening...</span>
            </div>
          )}
          
          <Button
            size="lg"
            className={`w-20 h-20 rounded-full shadow-lg transition-all duration-300 ${
              isListening 
                ? 'bg-destructive hover:bg-destructive/90 scale-110' 
                : 'bg-primary hover:bg-primary/90'
            }`}
            onClick={isListening ? stopListening : startListening}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : isListening ? (
              <MicOff className="h-8 w-8" />
            ) : (
              <Mic className="h-8 w-8" />
            )}
          </Button>
          
          <p className="text-sm text-muted-foreground text-center">
            {isListening 
              ? 'Tap to stop listening' 
              : isProcessing 
                ? 'Processing your request...'
                : 'Tap the microphone to start speaking'}
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}

// Type declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}
