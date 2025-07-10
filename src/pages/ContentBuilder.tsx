import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  GripVertical, 
  Play, 
  Save, 
  Eye,
  Settings,
  HelpCircle,
  CheckCircle2,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SCORMPackageManager } from '@/lib/scorm-package-manager';

interface Question {
  id: string;
  type: 'multiple-choice' | 'true-false' | 'drag-drop' | 'matching';
  title: string;
  content: string;
  options?: string[];
  correctAnswer?: string | number;
  dragItems?: { id: string; text: string; zone: string }[];
  matchingPairs?: { left: string; right: string }[];
  points: number;
}

interface ContentData {
  title: string;
  description: string;
  questions: Question[];
  passingScore: number;
  timeLimit?: number;
}

export function ContentBuilder() {
  const { templateId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const templateData = location.state;
  
  // Add error handling for missing template data
  if (!templateData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Template data not found</p>
          <Button onClick={() => navigate('/author')}>
            Return to Templates
          </Button>
        </div>
      </div>
    );
  }
  
  const [contentData, setContentData] = useState<ContentData>({
    title: templateData?.title || '',
    description: templateData?.description || '',
    questions: [],
    passingScore: 70,
    timeLimit: undefined
  });
  
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [isPreview, setIsPreview] = useState(false);

  const addQuestion = (type: Question['type']) => {
    const newQuestion: Question = {
      id: `q_${Date.now()}`,
      type,
      title: '',
      content: '',
      points: 10,
      ...(type === 'multiple-choice' && { options: ['', '', '', ''], correctAnswer: 0 }),
      ...(type === 'true-false' && { correctAnswer: 'true' }),
      ...(type === 'drag-drop' && { dragItems: [] }),
      ...(type === 'matching' && { matchingPairs: [{ left: '', right: '' }] })
    };
    
    setContentData(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion]
    }));
    setCurrentQuestion(newQuestion);
  };

  const updateQuestion = (questionId: string, updates: Partial<Question>) => {
    setContentData(prev => ({
      ...prev,
      questions: prev.questions.map(q => 
        q.id === questionId ? { ...q, ...updates } : q
      )
    }));
    
    if (currentQuestion?.id === questionId) {
      setCurrentQuestion(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const deleteQuestion = (questionId: string) => {
    setContentData(prev => ({
      ...prev,
      questions: prev.questions.filter(q => q.id !== questionId)
    }));
    
    if (currentQuestion?.id === questionId) {
      setCurrentQuestion(null);
    }
  };

  const generateSCORMPackage = async () => {
    try {
      // Validate content before generating
      if (!contentData.title.trim()) {
        toast({
          title: "Validation Error",
          description: "Content title is required",
          variant: "destructive"
        });
        return;
      }

      if (contentData.questions.length === 0) {
        toast({
          title: "Validation Error", 
          description: "At least one question is required",
          variant: "destructive"
        });
        return;
      }

      // Validate each question
      for (const question of contentData.questions) {
        if (!question.title.trim() || !question.content.trim()) {
          toast({
            title: "Validation Error",
            description: "All questions must have a title and content",
            variant: "destructive"
          });
          return;
        }
      }

      // Create HTML content for the authored content
      const htmlContent = generateHTMLContent();
      
      // Create manifest
      const manifest = {
        identifier: `authored_${Date.now()}`,
        version: "1.0",
        title: contentData.title,
        defaultOrganization: "authored_org",
        organizations: [{
          identifier: "authored_org",
          title: contentData.title,
          items: [{
            identifier: "content_item",
            title: contentData.title,
            href: "content.html",
            isVisible: true,
            children: []
          }]
        }],
        resources: [{
          identifier: "content_item",
          type: "webcontent",
          href: "content.html",
          files: ["content.html"]
        }]
      };

      // Create files map
      const files = new Map<string, Blob>();
      files.set('content.html', new Blob([htmlContent], { type: 'text/html' }));
      files.set('imsmanifest.xml', new Blob([generateManifestXML(manifest)], { type: 'application/xml' }));

      // Create package object
      const scormPackage = {
        id: `authored_${Date.now()}`,
        name: contentData.title,
        uploadDate: new Date(),
        manifest,
        files,
        size: htmlContent.length
      };

      // Store the package
      await SCORMPackageManager.storePackage(scormPackage);
      
      toast({
        title: "Content Published",
        description: `${contentData.title} has been created and added to your content library`,
      });

      navigate('/packages');
    } catch (error) {
      console.error('SCORM generation error:', error);
      toast({
        title: "Publishing Failed",
        description: "Failed to create SCORM package. Check console for details.",
        variant: "destructive"
      });
    }
  };

  const generateHTMLContent = (): string => {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>${contentData.title}</title>
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
        .question {
            background: rgba(255,255,255,0.1);
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
        }
        .option {
            margin: 10px 0;
            padding: 10px;
            background: rgba(255,255,255,0.1);
            border-radius: 5px;
            cursor: pointer;
            transition: background 0.3s;
        }
        .option:hover {
            background: rgba(255,255,255,0.2);
        }
        .drag-zone {
            min-height: 100px;
            border: 2px dashed rgba(255,255,255,0.5);
            border-radius: 10px;
            padding: 20px;
            margin: 10px 0;
        }
        .drag-item {
            display: inline-block;
            padding: 10px 15px;
            background: rgba(255,255,255,0.2);
            border-radius: 5px;
            margin: 5px;
            cursor: move;
            user-select: none;
        }
        .matching-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }
        .match-item {
            padding: 10px;
            background: rgba(255,255,255,0.1);
            border-radius: 5px;
            margin: 5px 0;
            cursor: pointer;
        }
        .selected {
            background: rgba(76, 175, 80, 0.5) !important;
        }
        .correct {
            background: rgba(76, 175, 80, 0.7) !important;
        }
        .incorrect {
            background: rgba(244, 67, 54, 0.7) !important;
        }
        .btn {
            background: #4CAF50;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            margin: 10px 5px;
        }
        .btn:hover {
            background: #45a049;
        }
        .score-display {
            font-size: 24px;
            font-weight: bold;
            text-align: center;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="content">
        <h1>${contentData.title}</h1>
        <p>${contentData.description}</p>
        
        <div id="quiz-container">
            ${contentData.questions.map((question, index) => generateQuestionHTML(question, index)).join('')}
        </div>
        
        <div class="score-display" id="score-display" style="display: none;">
            Your Score: <span id="score">0</span>%
        </div>
        
        <button class="btn" onclick="submitQuiz()">Submit Quiz</button>
        <button class="btn" onclick="resetQuiz()" style="background: #f44336;">Reset</button>
    </div>

    <script>
        let answers = {};
        let totalQuestions = ${contentData.questions.length};
        
        // SCORM API communication
        if (window.API) {
            window.API.LMSInitialize('');
        }
        
        function submitQuiz() {
            let correct = 0;
            ${contentData.questions.map((q, i) => generateValidationJS(q, i)).join('\n')}
            
            let score = Math.round((correct / totalQuestions) * 100);
            document.getElementById('score').textContent = score;
            document.getElementById('score-display').style.display = 'block';
            
            // Report to SCORM
            if (window.API) {
                window.API.LMSSetValue('cmi.core.score.raw', score.toString());
                window.API.LMSSetValue('cmi.core.lesson_status', score >= ${contentData.passingScore} ? 'completed' : 'incomplete');
                window.API.LMSCommit('');
            }
        }
        
        function resetQuiz() {
            answers = {};
            document.querySelectorAll('.option, .match-item').forEach(el => {
                el.classList.remove('selected', 'correct', 'incorrect');
            });
            document.getElementById('score-display').style.display = 'none';
        }
        
        ${generateInteractionJS()}
    </script>
</body>
</html>`;
  };

  const generateQuestionHTML = (question: Question, index: number): string => {
    const questionNumber = index + 1;
    
    switch (question.type) {
      case 'multiple-choice':
        return `
          <div class="question" id="question-${index}">
            <h3>Question ${questionNumber}: ${question.title}</h3>
            <p>${question.content}</p>
            ${question.options?.map((option, optIndex) => `
              <div class="option" onclick="selectMultipleChoice(${index}, ${optIndex})">
                <input type="radio" name="q${index}" value="${optIndex}" style="margin-right: 10px;">
                ${option}
              </div>
            `).join('') || ''}
          </div>`;
      
      case 'true-false':
        return `
          <div class="question" id="question-${index}">
            <h3>Question ${questionNumber}: ${question.title}</h3>
            <p>${question.content}</p>
            <div class="option" onclick="selectTrueFalse(${index}, 'true')">
              <input type="radio" name="q${index}" value="true" style="margin-right: 10px;">
              True
            </div>
            <div class="option" onclick="selectTrueFalse(${index}, 'false')">
              <input type="radio" name="q${index}" value="false" style="margin-right: 10px;">
              False
            </div>
          </div>`;
      
      case 'drag-drop':
        return `
          <div class="question" id="question-${index}">
            <h3>Question ${questionNumber}: ${question.title}</h3>
            <p>${question.content}</p>
            <div class="drag-items">
              ${question.dragItems?.map(item => `
                <div class="drag-item" draggable="true" data-item="${item.id}">${item.text}</div>
              `).join('') || ''}
            </div>
            <div class="drag-zones">
              ${Array.from(new Set(question.dragItems?.map(item => item.zone) || [])).map(zone => `
                <div class="drag-zone" data-zone="${zone}" ondrop="drop(event)" ondragover="allowDrop(event)">
                  <strong>${zone}</strong>
                </div>
              `).join('')}
            </div>
          </div>`;
      
      case 'matching':
        return `
          <div class="question" id="question-${index}">
            <h3>Question ${questionNumber}: ${question.title}</h3>
            <p>${question.content}</p>
            <div class="matching-container">
              <div class="left-column">
                ${question.matchingPairs?.map((pair, pairIndex) => `
                  <div class="match-item" onclick="selectMatch(${index}, 'left', ${pairIndex})" data-pair="${pairIndex}">
                    ${pair.left}
                  </div>
                `).join('') || ''}
              </div>
              <div class="right-column">
                ${question.matchingPairs?.map((pair, pairIndex) => `
                  <div class="match-item" onclick="selectMatch(${index}, 'right', ${pairIndex})" data-pair="${pairIndex}">
                    ${pair.right}
                  </div>
                `).join('') || ''}
              </div>
            </div>
          </div>`;
      
      default:
        return '';
    }
  };

  const generateValidationJS = (question: Question, index: number): string => {
    switch (question.type) {
      case 'multiple-choice':
        return `if (answers.q${index} === ${question.correctAnswer}) correct++;`;
      case 'true-false':
        return `if (answers.q${index} === '${question.correctAnswer}') correct++;`;
      case 'drag-drop':
        return `// Drag-drop validation logic here`;
      case 'matching':
        return `// Matching validation logic here`;
      default:
        return '';
    }
  };

  const generateInteractionJS = (): string => {
    return `
      function selectMultipleChoice(questionIndex, optionIndex) {
        answers['q' + questionIndex] = optionIndex;
        document.querySelectorAll('#question-' + questionIndex + ' .option').forEach(el => {
          el.classList.remove('selected');
        });
        event.target.classList.add('selected');
      }
      
      function selectTrueFalse(questionIndex, value) {
        answers['q' + questionIndex] = value;
        document.querySelectorAll('#question-' + questionIndex + ' .option').forEach(el => {
          el.classList.remove('selected');
        });
        event.target.classList.add('selected');
      }
      
      function allowDrop(ev) {
        ev.preventDefault();
      }
      
      function drag(ev) {
        ev.dataTransfer.setData("text", ev.target.dataset.item);
      }
      
      function drop(ev) {
        ev.preventDefault();
        var data = ev.dataTransfer.getData("text");
        var dragElement = document.querySelector('[data-item="' + data + '"]');
        ev.target.appendChild(dragElement);
      }
      
      let selectedMatches = {};
      function selectMatch(questionIndex, side, pairIndex) {
        if (!selectedMatches['q' + questionIndex]) selectedMatches['q' + questionIndex] = {};
        selectedMatches['q' + questionIndex][side] = pairIndex;
        
        // Visual feedback
        document.querySelectorAll('#question-' + questionIndex + ' .match-item').forEach(el => {
          el.classList.remove('selected');
        });
        event.target.classList.add('selected');
      }
      
      // Add drag event listeners
      document.querySelectorAll('.drag-item').forEach(item => {
        item.addEventListener('dragstart', drag);
      });
    `;
  };

  const generateManifestXML = (manifest: any): string => {
    return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${manifest.identifier}" version="${manifest.version}" 
    xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2" 
    xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="${manifest.defaultOrganization}">
    <organization identifier="${manifest.organizations[0].identifier}">
      <title>${manifest.organizations[0].title}</title>
      <item identifier="${manifest.organizations[0].items[0].identifier}" identifierref="${manifest.organizations[0].items[0].identifier}">
        <title>${manifest.organizations[0].items[0].title}</title>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="${manifest.resources[0].identifier}" type="${manifest.resources[0].type}" href="${manifest.resources[0].href}" adlcp:scormtype="sco">
      <file href="${manifest.resources[0].href}"/>
    </resource>
  </resources>
</manifest>`;
  };


  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-slate-900 text-white shadow-lg border-b border-slate-700">
        <div className="container mx-auto p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/author')}
                className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Templates
              </Button>
              <div>
                <h1 className="text-xl font-bold">{contentData.title || 'New Content'}</h1>
                <p className="text-slate-300 text-sm">{templateData.template?.name} Builder</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline"
                size="sm"
                className="border-slate-600 text-slate-300 hover:bg-slate-800"
                onClick={() => setIsPreview(!isPreview)}
              >
                <Eye className="h-4 w-4 mr-2" />
                {isPreview ? 'Edit' : 'Preview'}
              </Button>
              <Button 
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={generateSCORMPackage}
                disabled={contentData.questions.length === 0}
              >
                <Save className="h-4 w-4 mr-2" />
                Publish SCORM
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-6">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Question List */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Questions ({contentData.questions.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-96">
                <div className="space-y-2 p-4">
                  {contentData.questions.map((question, index) => (
                    <div
                      key={question.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        currentQuestion?.id === question.id 
                          ? 'bg-emerald-50 border-emerald-200' 
                          : 'hover:bg-slate-50'
                      }`}
                      onClick={() => setCurrentQuestion(question)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-4 w-4 text-slate-400" />
                          <span className="font-medium text-sm">Q{index + 1}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteQuestion(question.id);
                          }}
                          className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 truncate">
                        {question.title || 'Untitled Question'}
                      </p>
                      <Badge variant="outline" className="text-xs mt-1">
                        {question.type}
                      </Badge>
                    </div>
                  ))}
                  
                  <div className="border-t pt-3 mt-3">
                    <div className="space-y-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => addQuestion('multiple-choice')}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Multiple Choice
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => addQuestion('true-false')}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        True/False
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => addQuestion('drag-drop')}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Drag & Drop
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => addQuestion('matching')}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Matching
                      </Button>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Question Editor */}
          <div className="lg:col-span-3">
            {currentQuestion ? (
              <QuestionEditor 
                question={currentQuestion}
                onUpdate={(updates) => updateQuestion(currentQuestion.id, updates)}
              />
            ) : (
              <Card className="h-96 flex items-center justify-center">
                <div className="text-center text-slate-500">
                  <HelpCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="font-medium mb-2">No Question Selected</h3>
                  <p className="text-sm">Select a question from the list or create a new one to start editing</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Question Editor Component
interface QuestionEditorProps {
  question: Question;
  onUpdate: (updates: Partial<Question>) => void;
}

function QuestionEditor({ question, onUpdate }: QuestionEditorProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="capitalize">
            {question.type.replace('-', ' ')} Question
          </CardTitle>
          <Badge variant="outline">
            {question.points} points
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="title">Question Title</Label>
          <Input
            id="title"
            value={question.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="Enter question title..."
          />
        </div>

        <div>
          <Label htmlFor="content">Question Content</Label>
          <Textarea
            id="content"
            value={question.content}
            onChange={(e) => onUpdate({ content: e.target.value })}
            placeholder="Enter the question content..."
            rows={3}
          />
        </div>

        {/* Question Type Specific Editors */}
        {question.type === 'multiple-choice' && (
          <MultipleChoiceEditor question={question} onUpdate={onUpdate} />
        )}
        
        {question.type === 'true-false' && (
          <TrueFalseEditor question={question} onUpdate={onUpdate} />
        )}
        
        {question.type === 'drag-drop' && (
          <DragDropEditor question={question} onUpdate={onUpdate} />
        )}
        
        {question.type === 'matching' && (
          <MatchingEditor question={question} onUpdate={onUpdate} />
        )}

        <div className="flex items-center gap-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            <Label htmlFor="points">Points:</Label>
            <Input
              id="points"
              type="number"
              value={question.points}
              onChange={(e) => onUpdate({ points: parseInt(e.target.value) || 0 })}
              className="w-20"
              min="0"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Multiple Choice Editor
function MultipleChoiceEditor({ question, onUpdate }: QuestionEditorProps) {
  const addOption = () => {
    const newOptions = [...(question.options || []), ''];
    onUpdate({ options: newOptions });
  };

  const removeOption = (index: number) => {
    const newOptions = question.options?.filter((_, i) => i !== index) || [];
    onUpdate({ 
      options: newOptions,
      correctAnswer: typeof question.correctAnswer === 'number' && question.correctAnswer >= index 
        ? Math.max(0, question.correctAnswer - 1) 
        : question.correctAnswer
    });
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...(question.options || [])];
    newOptions[index] = value;
    onUpdate({ options: newOptions });
  };

  return (
    <div className="space-y-3">
      <Label>Answer Options</Label>
      {question.options?.map((option, index) => (
        <div key={index} className="flex items-center gap-2">
          <div className="flex items-center gap-2 flex-1">
            <input
              type="radio"
              name="correct-answer"
              checked={question.correctAnswer === index}
              onChange={() => onUpdate({ correctAnswer: index })}
            />
            <Input
              value={option}
              onChange={(e) => updateOption(index, e.target.value)}
              placeholder={`Option ${index + 1}...`}
            />
          </div>
          {(question.options?.length || 0) > 2 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => removeOption(index)}
              className="hover:bg-red-50 hover:text-red-600"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
      <Button variant="outline" onClick={addOption} className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Add Option
      </Button>
    </div>
  );
}

// True/False Editor
function TrueFalseEditor({ question, onUpdate }: QuestionEditorProps) {
  return (
    <div className="space-y-3">
      <Label>Correct Answer</Label>
      <div className="flex gap-4">
        <div className="flex items-center gap-2">
          <input
            type="radio"
            name="tf-answer"
            checked={question.correctAnswer === 'true'}
            onChange={() => onUpdate({ correctAnswer: 'true' })}
          />
          <Label>True</Label>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="radio"
            name="tf-answer"
            checked={question.correctAnswer === 'false'}
            onChange={() => onUpdate({ correctAnswer: 'false' })}
          />
          <Label>False</Label>
        </div>
      </div>
    </div>
  );
}

// Drag Drop Editor
function DragDropEditor({ question, onUpdate }: QuestionEditorProps) {
  const addDragItem = () => {
    const newItems = [...(question.dragItems || []), { id: `item_${Date.now()}`, text: '', zone: '' }];
    onUpdate({ dragItems: newItems });
  };

  const updateDragItem = (index: number, updates: Partial<typeof question.dragItems[0]>) => {
    const newItems = [...(question.dragItems || [])];
    newItems[index] = { ...newItems[index], ...updates };
    onUpdate({ dragItems: newItems });
  };

  const removeDragItem = (index: number) => {
    const newItems = question.dragItems?.filter((_, i) => i !== index) || [];
    onUpdate({ dragItems: newItems });
  };

  return (
    <div className="space-y-3">
      <Label>Drag & Drop Items</Label>
      {question.dragItems?.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            value={item.text}
            onChange={(e) => updateDragItem(index, { text: e.target.value })}
            placeholder="Item text..."
            className="flex-1"
          />
          <Input
            value={item.zone}
            onChange={(e) => updateDragItem(index, { zone: e.target.value })}
            placeholder="Target zone..."
            className="flex-1"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => removeDragItem(index)}
            className="hover:bg-red-50 hover:text-red-600"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button variant="outline" onClick={addDragItem} className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Add Drag Item
      </Button>
    </div>
  );
}

// Matching Editor
function MatchingEditor({ question, onUpdate }: QuestionEditorProps) {
  const addMatchingPair = () => {
    const newPairs = [...(question.matchingPairs || []), { left: '', right: '' }];
    onUpdate({ matchingPairs: newPairs });
  };

  const updateMatchingPair = (index: number, side: 'left' | 'right', value: string) => {
    const newPairs = [...(question.matchingPairs || [])];
    newPairs[index] = { ...newPairs[index], [side]: value };
    onUpdate({ matchingPairs: newPairs });
  };

  const removeMatchingPair = (index: number) => {
    const newPairs = question.matchingPairs?.filter((_, i) => i !== index) || [];
    onUpdate({ matchingPairs: newPairs });
  };

  return (
    <div className="space-y-3">
      <Label>Matching Pairs</Label>
      {question.matchingPairs?.map((pair, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            value={pair.left}
            onChange={(e) => updateMatchingPair(index, 'left', e.target.value)}
            placeholder="Left item..."
            className="flex-1"
          />
          <span className="text-slate-400">↔</span>
          <Input
            value={pair.right}
            onChange={(e) => updateMatchingPair(index, 'right', e.target.value)}
            placeholder="Right item..."
            className="flex-1"
          />
          {(question.matchingPairs?.length || 0) > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => removeMatchingPair(index)}
              className="hover:bg-red-50 hover:text-red-600"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
      <Button variant="outline" onClick={addMatchingPair} className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Add Matching Pair
      </Button>
    </div>
  );
}