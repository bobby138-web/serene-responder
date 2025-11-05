import { useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const useAudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast({
        title: 'Microphone Error',
        description: 'Could not access your microphone. Please check permissions.',
        variant: 'destructive',
      });
    }
  };

  const stopRecording = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      const mediaRecorder = mediaRecorderRef.current;
      if (!mediaRecorder) {
        reject(new Error('No media recorder'));
        return;
      }

      mediaRecorder.onstop = async () => {
        setIsRecording(false);
        setIsProcessing(true);

        try {
          const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
          const base64Audio = await blobToBase64(audioBlob);

          // Stop all tracks
          mediaRecorder.stream.getTracks().forEach(track => track.stop());

          const transcription = await transcribeAudio(base64Audio);
          setIsProcessing(false);
          resolve(transcription);
        } catch (error) {
          setIsProcessing(false);
          toast({
            title: 'Transcription Error',
            description: 'Could not transcribe your audio. Please try again.',
            variant: 'destructive',
          });
          reject(error);
        }
      };

      mediaRecorder.stop();
    });
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        resolve(base64String.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const transcribeAudio = async (base64Audio: string): Promise<string> => {
    const { data, error } = await supabase.functions.invoke('transcribe-audio', {
      body: { audio: base64Audio },
    });

    if (error) {
      throw new Error(error.message || 'Transcription failed');
    }

    return data.text;
  };

  return {
    isRecording,
    isProcessing,
    startRecording,
    stopRecording,
  };
};
