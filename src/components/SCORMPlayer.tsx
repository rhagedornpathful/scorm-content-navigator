import React, { useState, useRef, useEffect, useCallback } from 'react';
import DOMPurify from 'dompurify';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  BookOpen, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Menu,
  X,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { createSCORMAPI, LocalSCORMDataStore } from '@/lib/scorm-api';
import { SCORMManifestParser, type SCORMManifest, type SCORMItem } from '@/lib/scorm-manifest';
import { SCORMPackageManager } from '@/lib/scorm-package-manager';

interface SCORMPlayerProps {
  manifestUrl?: string;
  baseUrl?: string;
  userId?: string;
  courseId?: string;
  packageId?: string;
  className?: string;
}

interface PlayerState {
  isLoading: boolean;
  isPlaying: boolean;
  currentItemIndex: number;
  manifest: SCORMManifest | null;
  playableItems: SCORMItem[];
  showSidebar: boolean;
  sessionTime: number;
  lessonStatus: string;
  score: string;
}

export function SCORMPlayer({ 
  manifestUrl = '/demo/imsmanifest.xml',
  baseUrl = '/demo/',
  userId = 'demo_user',
  courseId = 'demo_course',
  packageId,
  className 
}: SCORMPlayerProps) {
  const { toast } = useToast();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const dataStoreRef = useRef<LocalSCORMDataStore>();
  const sessionTimerRef = useRef<NodeJS.Timeout>();

  const [state, setState] = useState<PlayerState>({
    isLoading: true,
    isPlaying: false,
    currentItemIndex: 0,
    manifest: null,
    playableItems: [],
    showSidebar: true,
    sessionTime: 0,
    lessonStatus: 'not attempted',
    score: ''
  });

  // Initialize data store and SCORM API
  useEffect(() => {
    dataStoreRef.current = new LocalSCORMDataStore(userId, courseId);
    
    // Create and inject SCORM APIs into window
    const { API, API_1484_11 } = createSCORMAPI(dataStoreRef.current);
    (window as any).API = API;
    (window as any).API_1484_11 = API_1484_11;

    loadManifest();

    return () => {
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
      }
    };
  }, [manifestUrl, userId, courseId]);

  // Session timer
  useEffect(() => {
    if (state.isPlaying) {
      sessionTimerRef.current = setInterval(() => {
        setState(prev => ({ ...prev, sessionTime: prev.sessionTime + 1 }));
      }, 1000);
    } else {
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
        sessionTimerRef.current = undefined;
      }
    }

    return () => {
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
      }
    };
  }, [state.isPlaying]);

  const loadManifest = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      let manifest: SCORMManifest;
      
      // If packageId is provided, load the actual uploaded package
      if (packageId) {
        const scormPackage = await SCORMPackageManager.getPackageById(packageId);
        if (!scormPackage) {
          throw new Error(`Package with ID ${packageId} not found`);
        }
        manifest = scormPackage.manifest;
      } else {
        // For demo purposes, create a sample manifest
        manifest = createDemoManifest();
      }
      
      const resolvedManifest = SCORMManifestParser.resolveItemResources(manifest);
      const playableItems = SCORMManifestParser.getPlayableItems(resolvedManifest);

      setState(prev => ({
        ...prev,
        manifest: resolvedManifest,
        playableItems,
        isLoading: false
      }));

      if (playableItems.length > 0) {
        loadSCO(0);
      }

    } catch (error) {
      console.error('Error loading manifest:', error);
      toast({
        title: "Error Loading Course",
        description: error instanceof Error ? error.message : "Failed to load the SCORM content.",
        variant: "destructive"
      });
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const createDemoManifest = (): SCORMManifest => {
    return {
      identifier: "demo_course",
      version: "1.0",
      title: "Demo SCORM Course",
      defaultOrganization: "demo_org",
      organizations: [{
        identifier: "demo_org",
        title: "Course Organization",
        items: [
          {
            identifier: "lesson1",
            title: "Introduction to SCORM",
            href: "lesson1.html",
            isVisible: true,
            children: []
          },
          {
            identifier: "lesson2", 
            title: "SCORM API Implementation",
            href: "lesson2.html",
            isVisible: true,
            children: []
          },
          {
            identifier: "quiz1",
            title: "Knowledge Check",
            href: "quiz.html",
            isVisible: true,
            children: []
          }
        ]
      }],
      resources: [
        {
          identifier: "lesson1",
          type: "webcontent",
          href: "lesson1.html",
          files: ["lesson1.html"]
        },
        {
          identifier: "lesson2",
          type: "webcontent", 
          href: "lesson2.html",
          files: ["lesson2.html"]
        },
        {
          identifier: "quiz1",
          type: "webcontent",
          href: "quiz.html", 
          files: ["quiz.html"]
        }
      ]
    };
  };

  // Create debug API wrapper
  const createDebugAPI = useCallback((originalAPI: any) => {
    return {
      LMSInitialize: function(param: string) {
        console.log('[SCORM] LMSInitialize called with:', param);
        console.trace();
        const result = originalAPI.LMSInitialize(param);
        console.log('[SCORM] LMSInitialize result:', result);
        return result;
      },
      LMSGetValue: function(element: string) {
        console.log('[SCORM] LMSGetValue:', element);
        const result = originalAPI.LMSGetValue(element);
        console.log('[SCORM] LMSGetValue result:', element, '=', result);
        return result;
      },
      LMSSetValue: function(element: string, value: string) {
        console.log('[SCORM] LMSSetValue:', element, '=', value);
        const result = originalAPI.LMSSetValue(element, value);
        console.log('[SCORM] LMSSetValue result:', result);
        return result;
      },
      LMSCommit: function(param: string) {
        console.log('[SCORM] LMSCommit called with:', param);
        const result = originalAPI.LMSCommit(param);
        console.log('[SCORM] LMSCommit result:', result);
        return result;
      },
      LMSFinish: function(param: string) {
        console.log('[SCORM] LMSFinish called with:', param);
        const result = originalAPI.LMSFinish(param);
        console.log('[SCORM] LMSFinish result:', result);
        return result;
      },
      LMSGetLastError: function() {
        const result = originalAPI.LMSGetLastError();
        console.log('[SCORM] LMSGetLastError result:', result);
        return result;
      },
      LMSGetErrorString: function(errorCode: string) {
        const result = originalAPI.LMSGetErrorString(errorCode);
        console.log('[SCORM] LMSGetErrorString result:', errorCode, '=', result);
        return result;
      },
      LMSGetDiagnostic: function(errorCode: string) {
        const result = originalAPI.LMSGetDiagnostic(errorCode);
        console.log('[SCORM] LMSGetDiagnostic result:', errorCode, '=', result);
        return result;
      }
    };
  }, []);

  // Inject API into iframe window with proper discovery pattern
  const injectSCORMAPI = useCallback((iframeWindow: Window) => {
    console.log('[SCORM] Injecting API into iframe window');
    
    const debugAPI = createDebugAPI((window as any).API);
    const debugAPI_1484_11 = createDebugAPI((window as any).API_1484_11);
    
    // Set the APIs directly on the iframe window
    (iframeWindow as any).API = debugAPI;
    (iframeWindow as any).API_1484_11 = debugAPI_1484_11;
    
    // Set parent references for API discovery
    (iframeWindow as any).parent = window;
    (iframeWindow as any).top = window;
    
    // Add the standard API discovery function to the iframe
    (iframeWindow as any).findAPI = function(win: Window): any {
      let attempts = 0;
      console.log('[SCORM] Starting API search from window:', win);
      
      while ((!(win as any).API && !(win as any).API_1484_11) && (win.parent != null) && (win.parent != win) && attempts < 500) {
        attempts++;
        console.log(`[SCORM] API search attempt ${attempts}, checking parent window`);
        win = win.parent;
        
        if ((win as any).API || (win as any).API_1484_11) {
          console.log('[SCORM] Found API at attempt:', attempts);
          break;
        }
      }
      
      const foundAPI = (win as any).API || (win as any).API_1484_11;
      console.log('[SCORM] API discovery result:', foundAPI ? 'Found' : 'Not found');
      return foundAPI;
    };
    
    console.log('[SCORM] API injection complete');
  }, [createDebugAPI]);

  const loadSCO = useCallback(async (itemIndex: number) => {
    if (!state.playableItems[itemIndex] || !iframeRef.current) return;

    const item = state.playableItems[itemIndex];
    console.log('[SCORM] Loading SCO:', item.title, 'File:', item.href);
    
    try {
      let contentUrl: string;
      
      // If packageId is provided, load actual content from uploaded package
      if (packageId) {
        console.log('[SCORM] Loading from package:', packageId);
        
        // Try multiple possible file paths
        const possiblePaths = [
          item.href,
          item.href.replace(/^\/+/, ''), // Remove leading slashes
          `/${item.href}`, // Add leading slash
          item.href.toLowerCase(), // Try lowercase
          item.href.replace('.html', '.htm'), // Try .htm extension
          item.href.replace('.htm', '.html') // Try .html extension
        ];
        
        let contentBlob: Blob | null = null;
        let foundPath = '';
        
        for (const path of possiblePaths) {
          console.log('[SCORM] Trying path:', path);
          contentBlob = await SCORMPackageManager.getPackageFile(packageId, path);
          if (contentBlob) {
            foundPath = path;
            console.log('[SCORM] Found content at path:', path);
            break;
          }
        }
        
        if (contentBlob) {
          console.log('[SCORM] Content blob type:', contentBlob.type);
          console.log('[SCORM] Content blob size:', contentBlob.size);
          
          // For HTML files, process the content
          if (item.href.toLowerCase().includes('.html') || item.href.toLowerCase().includes('.htm')) {
            const text = await contentBlob.text();
            console.log('[SCORM] HTML content preview:', text.substring(0, 500));
            
            // Inject API discovery script into the HTML content
            const modifiedHTML = text.replace(
              '</head>',
              `<script>
                console.log('[SCORM Content] Document loading...');
                window.findAPI = function(win) {
                  let attempts = 0;
                  while ((!win.API && !win.API_1484_11) && (win.parent != null) && (win.parent != win) && attempts < 500) {
                    attempts++;
                    win = win.parent;
                  }
                  return win.API || win.API_1484_11;
                };
                
                window.addEventListener('load', function() {
                  console.log('[SCORM Content] Window loaded, searching for API...');
                  window.API = window.findAPI(window);
                  window.API_1484_11 = window.API;
                  console.log('[SCORM Content] API found:', !!window.API);
                });
              </script>
              </head>`
            );
            
            const htmlBlob = new Blob([modifiedHTML], { type: 'text/html; charset=utf-8' });
            contentUrl = URL.createObjectURL(htmlBlob);
          } else {
            contentUrl = URL.createObjectURL(contentBlob);
          }
        } else {
          console.error('[SCORM] Content file not found. Tried paths:', possiblePaths);
          throw new Error(`Content file ${item.href} not found in package.`);
        }
      } else {
        // Create demo content for demo mode
        const demoContent = createDemoContent(item);
        const blob = new Blob([demoContent], { type: 'text/html; charset=utf-8' });
        contentUrl = URL.createObjectURL(blob);
      }

      // Initialize SCORM session
      if (dataStoreRef.current) {
        dataStoreRef.current.initialize();
        dataStoreRef.current.setValue('cmi.core.lesson_location', item.identifier);
        dataStoreRef.current.setValue('cmi.core.lesson_status', 'incomplete');
      }

      setState(prev => ({
        ...prev,
        currentItemIndex: itemIndex,
        isPlaying: true,
        lessonStatus: 'incomplete'
      }));

      // Set up iframe event handlers before loading
      iframeRef.current.onload = () => {
        console.log('[SCORM] Iframe loaded successfully');
        
        if (iframeRef.current?.contentWindow) {
          console.log('[SCORM] Content window available');
          
          // Inject SCORM API into the iframe
          injectSCORMAPI(iframeRef.current.contentWindow);
          
          // Monitor iframe content
          setTimeout(() => {
            if (iframeRef.current?.contentDocument) {
              const body = iframeRef.current.contentDocument.body;
              console.log('[SCORM] Content body HTML length:', body?.innerHTML?.length || 0);
              console.log('[SCORM] Body dimensions:', {
                scrollHeight: body?.scrollHeight,
                scrollWidth: body?.scrollWidth,
                clientHeight: body?.clientHeight,
                clientWidth: body?.clientWidth
              });
              
              // Check if content is actually visible
              const hasVisibleContent = body && (body.scrollHeight > 0 || body.innerHTML.trim().length > 0);
              console.log('[SCORM] Has visible content:', hasVisibleContent);
            }
          }, 1000);
        }
      };
      
      iframeRef.current.onerror = (error) => {
        console.error('[SCORM] Iframe error:', error);
      };

      // Load content in iframe
      console.log('[SCORM] Setting iframe src to:', contentUrl);
      iframeRef.current.src = contentUrl;

      toast({
        title: "Loading Content",
        description: `Now playing: ${item.title}`
      });
      
    } catch (error) {
      console.error('[SCORM] Error loading SCO:', error);
      toast({
        title: "Error Loading Content",
        description: error instanceof Error ? error.message : "Failed to load content",
        variant: "destructive"
      });
    }
  }, [state.playableItems, packageId, toast, injectSCORMAPI]);

  const validateContentSecurity = (content: string): boolean => {
    // Basic security checks
    const suspiciousPatterns = [
      /<script[^>]*src\s*=\s*["'][^"']*["']/gi,
      /javascript\s*:/gi,
      /data\s*:\s*text\/html/gi,
      /vbscript\s*:/gi
    ];
    
    return !suspiciousPatterns.some(pattern => pattern.test(content));
  };

  const createDemoContent = (item: SCORMItem): string => {
    // Sanitize the title to prevent XSS
    const sanitizedTitle = DOMPurify.sanitize(item.title, { 
      ALLOWED_TAGS: [], 
      ALLOWED_ATTR: [] 
    });
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>${sanitizedTitle}</title>
        <style>
            body { 
                font-family: system-ui, -apple-system, sans-serif; 
                padding: 40px; 
                line-height: 1.6;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                min-height: 100vh;
                margin: 0;
            }
            .content {
                background: rgba(255,255,255,0.1);
                padding: 30px;
                border-radius: 15px;
                backdrop-filter: blur(10px);
                max-width: 800px;
                margin: 0 auto;
            }
            .complete-btn {
                background: #4CAF50;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 16px;
                margin-top: 20px;
            }
            .complete-btn:hover {
                background: #45a049;
            }
            .progress-indicator {
                background: rgba(255,255,255,0.2);
                height: 6px;
                border-radius: 3px;
                margin: 20px 0;
            }
            .progress-bar {
                background: #4CAF50;
                height: 100%;
                border-radius: 3px;
                width: 0%;
                transition: width 0.3s;
            }
        </style>
    </head>
    <body>
        <div class="content">
            <h1>${sanitizedTitle}</h1>
            <div class="progress-indicator">
                <div id="progressBar" class="progress-bar"></div>
            </div>
            <p>Welcome to this SCORM demonstration. This content is communicating with the SCORM API.</p>
            <p><strong>Current Status:</strong> <span id="status">Incomplete</span></p>
            <p><strong>Session Time:</strong> <span id="sessionTime">00:00:00</span></p>
            
            <h2>Learning Content</h2>
            <p>This is a sample SCORM content object that demonstrates:</p>
            <ul>
                <li>SCORM API communication</li>
                <li>Progress tracking</li>
                <li>Score reporting</li>
                <li>Session management</li>
            </ul>
            
            <button class="complete-btn" onclick="completeLesson()">Mark as Complete</button>
        </div>

        <script>
            let startTime = new Date();
            let progress = 0;
            
            function updateProgress() {
                progress += 10;
                document.getElementById('progressBar').style.width = progress + '%';
                
                if (window.API) {
                    window.API.LMSSetValue('cmi.core.score.raw', progress.toString());
                    window.API.LMSCommit('');
                }
            }
            
            function updateSessionTime() {
                const elapsed = Math.floor((new Date() - startTime) / 1000);
                const hours = Math.floor(elapsed / 3600).toString().padStart(2, '0');
                const minutes = Math.floor((elapsed % 3600) / 60).toString().padStart(2, '0');
                const seconds = (elapsed % 60).toString().padStart(2, '0');
                
                document.getElementById('sessionTime').textContent = hours + ':' + minutes + ':' + seconds;
                
                if (window.API) {
                    window.API.LMSSetValue('cmi.core.session_time', hours + ':' + minutes + ':' + seconds);
                }
            }
            
            function completeLesson() {
                if (window.API) {
                    window.API.LMSSetValue('cmi.core.lesson_status', 'completed');
                    window.API.LMSSetValue('cmi.core.score.raw', '100');
                    window.API.LMSCommit('');
                    window.API.LMSFinish('');
                }
                
                document.getElementById('status').textContent = 'Completed';
                document.getElementById('progressBar').style.width = '100%';
                alert('Lesson completed successfully!');
            }
            
            // Initialize SCORM
            if (window.API) {
                window.API.LMSInitialize('');
                window.API.LMSSetValue('cmi.core.lesson_status', 'incomplete');
            }
            
            // Update progress and time periodically
            setInterval(updateProgress, 2000);
            setInterval(updateSessionTime, 1000);
        </script>
    </body>
    </html>
    `;
  };

  const navigateToItem = (index: number) => {
    if (index >= 0 && index < state.playableItems.length) {
      loadSCO(index);
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentItem = state.playableItems[state.currentItemIndex];
  const progress = state.playableItems.length > 0 ? 
    ((state.currentItemIndex + 1) / state.playableItems.length) * 100 : 0;

  if (state.isLoading) {
    return (
      <div className={cn("flex items-center justify-center min-h-[600px]", className)}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading SCORM content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("h-screen flex flex-col bg-background", className)}>
      {/* Header */}
      <Card className="rounded-none border-x-0 border-t-0 shadow-sm">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setState(prev => ({ ...prev, showSidebar: !prev.showSidebar }))}
            >
              {state.showSidebar ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
            
            <div className="flex items-center gap-2">
              <img 
                src="/lovable-uploads/2d90e592-5f80-484d-b3c7-2baacd1b6118.png" 
                alt="Pathful" 
                className="h-5 w-auto"
              />
              <h1 className="font-semibold">{state.manifest?.title}</h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {formatTime(state.sessionTime)}
            </div>
            
            <Badge variant={state.lessonStatus === 'completed' ? 'default' : 'secondary'}>
              {state.lessonStatus === 'completed' ? 
                <CheckCircle2 className="h-3 w-3 mr-1" /> : 
                <AlertCircle className="h-3 w-3 mr-1" />
              }
              {state.lessonStatus}
            </Badge>
          </div>
        </div>

        <div className="px-4 pb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Course Progress</span>
            <span className="text-sm text-muted-foreground">
              {state.currentItemIndex + 1} of {state.playableItems.length}
            </span>
          </div>
          <Progress value={progress} className="w-full" />
        </div>
      </Card>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {state.showSidebar && (
          <Card className="w-80 rounded-none border-y-0 border-l-0 flex flex-col">
            <div className="p-4 border-b">
              <h2 className="font-semibold mb-2">Course Content</h2>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateToItem(state.currentItemIndex - 1)}
                  disabled={state.currentItemIndex === 0}
                >
                  <SkipBack className="h-4 w-4" />
                </Button>
                
                <Button
                  variant={state.isPlaying ? "secondary" : "default"}
                  size="sm"
                  onClick={() => setState(prev => ({ ...prev, isPlaying: !prev.isPlaying }))}
                >
                  {state.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateToItem(state.currentItemIndex + 1)}
                  disabled={state.currentItemIndex === state.playableItems.length - 1}
                >
                  <SkipForward className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1 p-2">
              <div className="space-y-1">
                {state.playableItems.map((item, index) => (
                  <Button
                    key={item.identifier}
                    variant={index === state.currentItemIndex ? "secondary" : "ghost"}
                    className="w-full justify-start text-left h-auto p-3"
                    onClick={() => navigateToItem(index)}
                  >
                    <div className="flex items-start gap-3">
                      <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{item.title}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {index === state.currentItemIndex ? 'Current' : 
                           index < state.currentItemIndex ? 'Completed' : 'Upcoming'}
                        </div>
                      </div>
                      {index < state.currentItemIndex && (
                        <CheckCircle2 className="h-4 w-4 text-learning-complete" />
                      )}
                    </div>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </Card>
        )}

        {/* Content Area */}
        <div className="flex-1 flex flex-col relative">
          {currentItem ? (
            <div className="flex-1 bg-white relative">
              {/* Debug overlay */}
              <div className="absolute top-0 left-0 bg-black text-white p-2 text-xs z-10 opacity-75">
                Playing: {currentItem.title} | File: {currentItem.href}
              </div>
              
              <iframe
                ref={iframeRef}
                title={DOMPurify.sanitize(currentItem.title, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })}
                className="w-full h-full border-0 bg-white"
                sandbox="allow-same-origin allow-scripts allow-forms"
                style={{ 
                  minHeight: '600px',
                  width: '100%',
                  height: '100%',
                  border: '1px solid #ccc',
                  overflow: 'auto',
                  display: 'block'
                }}
                allowFullScreen
              />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-slate-50">
              <div className="text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="font-medium mb-2">No Content Selected</h3>
                <p className="text-sm">Select a lesson from the sidebar to start learning</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}