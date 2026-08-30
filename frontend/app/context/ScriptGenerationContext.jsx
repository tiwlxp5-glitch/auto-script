import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { scanForBannedWords } from '../lib/bannedWords';

const ScriptGenerationContext = createContext(null);

export function ScriptGenerationProvider({ children }) {
  const { user, profile, setProfile } = useAuth();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generatingMode, setGeneratingMode] = useState(null); // 'single' or 'multi'
  const [generatedScript, setGeneratedScript] = useState(null);
  const [error, setError] = useState(null);
  const [usedProBrain, setUsedProBrain] = useState(false);
  const [bannedWarnings, setBannedWarnings] = useState([]);
  
  const abortControllerRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const timeoutIdRef = useRef(null);

  // ป้องกัน Memory Leak & Reset State เมื่อ Logout
  useEffect(() => {
    if (!user) {
      clearGenerationState();
    }
  }, [user]);

  const clearGenerationState = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
    setIsGenerating(false);
    setGenerationProgress(0);
    setGeneratingMode(null);
    setGeneratedScript(null);
    setError(null);
    setUsedProBrain(false);
    setBannedWarnings([]);
  };

  const clearResult = () => {
    setGeneratedScript(null);
    setError(null);
    setGenerationProgress(0);
  };

  const generateScript = async (payload, isMultiVersion, isProBrain) => {
    setIsGenerating(true);
    setGeneratingMode(isMultiVersion ? 'multi' : 'single');
    setError(null);
    setGeneratedScript(null);
    setBannedWarnings([]);
    setGenerationProgress(0);

    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    let currentProgress = 0;
    
    const expectedTimeMs = isProBrain ? 40000 : (isMultiVersion ? 25000 : 12000);
    const updateIntervalMs = 100;
    const totalSteps = expectedTimeMs / updateIntervalMs;
    const incrementPerStep = 99 / totalSteps;

    progressIntervalRef.current = setInterval(() => {
      if (currentProgress < 85) {
        currentProgress += incrementPerStep;
      } else if (currentProgress < 99) {
        currentProgress += (99.9 - currentProgress) * 0.015;
      } else {
        currentProgress = 99;
      }
      setGenerationProgress(Math.floor(currentProgress));
    }, updateIntervalMs);

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const timeoutDuration = isProBrain ? 100000 : 60000;
    timeoutIdRef.current = setTimeout(() => controller.abort(), timeoutDuration);

    let hasError = false;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('กรุณาล็อกอินใหม่');
      }
      
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
      
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        throw new Error('การเชื่อมต่อกับเซิร์ฟเวอร์ขัดข้อง (Timeout) เครดิตของคุณถูกคืนให้แล้ว กรุณาลองใหม่');
      }

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || "Failed to generate script");
      }

      let finalScriptData = responseData.script;
      const newCredits = responseData.credits_remaining;
      const proBrainUsed = !!responseData.used_pro_brain;
      
      let allText = '';
      
      if (finalScriptData.raw_multi_version) {
        const raw = finalScriptData.raw_multi_version;
        const funnyMatch = raw.match(/<VERSION_FUNNY>([\s\S]*?)<\/VERSION_FUNNY>/);
        const reviewMatch = raw.match(/<VERSION_REVIEW>([\s\S]*?)<\/VERSION_REVIEW>/);
        const fomoMatch = raw.match(/<VERSION_FOMO>([\s\S]*?)<\/VERSION_FOMO>/);
        
        const safeParse = (str) => {
          try { return JSON.parse(str.replace(/```json/g, '').replace(/```/g, '').trim()); } 
          catch(e) { return null; }
        };

        finalScriptData = {
          isMulti: true,
          funny: funnyMatch ? safeParse(funnyMatch[1]) : null,
          review: reviewMatch ? safeParse(reviewMatch[1]) : null,
          fomo: fomoMatch ? safeParse(fomoMatch[1]) : null
        };
        
        const getBlocks = (scriptObj) => scriptObj?.script_blocks?.map(b => b.audio_spoken).join(' ') || '';
        allText = getBlocks(finalScriptData.funny) + ' ' + getBlocks(finalScriptData.review) + ' ' + getBlocks(finalScriptData.fomo);
      } else {
        allText = finalScriptData.script_blocks?.map(b => b.audio_spoken).join(' ') || '';
      }

      const warnings = scanForBannedWords(allText);
      const uniqueWarnings = Array.from(new Set(warnings.map(a => a.word)))
        .map(word => warnings.find(a => a.word === word));
        
      setBannedWarnings(uniqueWarnings);
      setGeneratedScript(finalScriptData);
      setUsedProBrain(proBrainUsed);
      
      setProfile(prev => prev ? { 
        ...prev, 
        credits: newCredits,
        ...(responseData.trial_pro_remaining !== undefined && { trial_pro_remaining: responseData.trial_pro_remaining })
      } : prev);
      
      window.dispatchEvent(new Event('profileUpdated'));

    } catch (err) {
      hasError = true;
      console.error(err);
      if (err.name === 'AbortError') {
        setError('การเชื่อมต่อใช้เวลานานเกินไป (60 วินาที) กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่ครับ');
      } else {
        setError(err.message || "เกิดข้อผิดพลาดในการสร้างสคริปต์ กรุณาลองใหม่อีกครั้งครับ");
      }
    } finally {
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      setGenerationProgress(100);
      
      if (hasError) {
        setIsGenerating(false);
        setGeneratingMode(null);
      } else {
        setTimeout(() => {
          setIsGenerating(false);
          setGeneratingMode(null);
        }, 500);
      }
    }
  };

  return (
    <ScriptGenerationContext.Provider value={{
      isGenerating,
      generationProgress,
      generatingMode,
      generatedScript,
      error,
      usedProBrain,
      bannedWarnings,
      generateScript,
      clearResult
    }}>
      {children}
    </ScriptGenerationContext.Provider>
  );
}

export const useScriptGeneration = () => useContext(ScriptGenerationContext);
