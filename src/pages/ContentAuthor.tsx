import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  BookOpen, 
  Brain, 
  ClipboardCheck, 
  FileText, 
  Puzzle,
  Zap,
  Plus,
  GripVertical
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ContentTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  category: 'quiz' | 'training' | 'assessment';
  features: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

const contentTemplates: ContentTemplate[] = [
  {
    id: 'quiz-basic',
    name: 'Basic Quiz',
    description: 'Multiple choice questions with instant feedback',
    icon: ClipboardCheck,
    category: 'quiz',
    features: ['Multiple Choice', 'True/False', 'Instant Feedback', 'Score Tracking'],
    difficulty: 'beginner'
  },
  {
    id: 'quiz-drag-drop',
    name: 'Drag & Drop Quiz',
    description: 'Interactive drag-and-drop questions and sorting activities',
    icon: Puzzle,
    category: 'quiz',
    features: ['Drag & Drop', 'Sorting', 'Visual Feedback', 'Custom Zones'],
    difficulty: 'intermediate'
  },
  {
    id: 'quiz-matching',
    name: 'Matching Quiz',
    description: 'Connect related items with matching pairs',
    icon: Brain,
    category: 'quiz',
    features: ['Pair Matching', 'Multi-Column', 'Randomization', 'Visual Connections'],
    difficulty: 'intermediate'
  },
  {
    id: 'training-interactive',
    name: 'Interactive Training',
    description: 'Slide-based training with embedded interactions',
    icon: BookOpen,
    category: 'training',
    features: ['Slide Navigation', 'Embedded Quizzes', 'Progress Tracking', 'Bookmarks'],
    difficulty: 'beginner'
  },
  {
    id: 'training-scenario',
    name: 'Scenario Training',
    description: 'Branching scenarios with decision points',
    icon: Zap,
    category: 'training',
    features: ['Branching Logic', 'Decision Trees', 'Multiple Outcomes', 'Role Playing'],
    difficulty: 'advanced'
  },
  {
    id: 'assessment-formal',
    name: 'Formal Assessment',
    description: 'Comprehensive assessment with detailed reporting',
    icon: FileText,
    category: 'assessment',
    features: ['Timed Questions', 'Question Banks', 'Detailed Reports', 'Pass/Fail Logic'],
    difficulty: 'advanced'
  }
];

export function ContentAuthor() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<ContentTemplate | null>(null);
  const [contentTitle, setContentTitle] = useState('');
  const [contentDescription, setContentDescription] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const filteredTemplates = contentTemplates.filter(template => 
    filterCategory === 'all' || template.category === filterCategory
  );

  const handleCreateContent = () => {
    if (!selectedTemplate || !contentTitle.trim()) {
      toast({
        title: "Missing Information",
        description: "Please select a template and enter a content title",
        variant: "destructive"
      });
      return;
    }

    // Navigate to the content builder with the selected template
    navigate(`/author/build/${selectedTemplate.id}`, {
      state: {
        template: selectedTemplate,
        title: contentTitle,
        description: contentDescription
      }
    });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'quiz': return 'bg-blue-100 text-blue-800';
      case 'training': return 'bg-purple-100 text-purple-800';
      case 'assessment': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-slate-900 text-white shadow-lg border-b border-slate-700">
        <div className="container mx-auto p-6">
          <div className="flex items-center gap-4 mb-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/')}
              className="flex items-center gap-2 border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>
          <div className="flex items-center gap-4">
            <img 
              src="/lovable-uploads/2d90e592-5f80-484d-b3c7-2baacd1b6118.png" 
              alt="Pathful" 
              className="h-10 w-auto"
            />
            <div>
              <h1 className="text-3xl font-bold">Content Authoring Studio</h1>
              <p className="text-slate-300 mt-1">Create interactive SCORM content from templates</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-6">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Template Selection */}
          <div className="lg:col-span-2">
            <Card className="shadow-lg">
              <CardHeader className="bg-slate-50 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-slate-800">Choose Content Template</CardTitle>
                    <CardDescription className="text-slate-600">
                      Select a template to start creating your content
                    </CardDescription>
                  </div>
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Templates</SelectItem>
                      <SelectItem value="quiz">Quizzes</SelectItem>
                      <SelectItem value="training">Training</SelectItem>
                      <SelectItem value="assessment">Assessments</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 gap-4">
                  {filteredTemplates.map((template) => (
                    <Card 
                      key={template.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedTemplate?.id === template.id 
                          ? 'ring-2 ring-emerald-500 bg-emerald-50' 
                          : 'hover:border-emerald-300'
                      }`}
                      onClick={() => setSelectedTemplate(template)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="bg-emerald-100 rounded-lg p-2">
                            <template.icon className="h-6 w-6 text-emerald-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-sm">{template.name}</h3>
                              <Badge className={`text-xs ${getCategoryColor(template.category)}`}>
                                {template.category}
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-600 mb-3">{template.description}</p>
                            
                            <div className="flex items-center justify-between mb-2">
                              <Badge className={`text-xs ${getDifficultyColor(template.difficulty)}`}>
                                {template.difficulty}
                              </Badge>
                            </div>
                            
                            <div className="flex flex-wrap gap-1">
                              {template.features.slice(0, 2).map((feature) => (
                                <Badge key={feature} variant="outline" className="text-xs">
                                  {feature}
                                </Badge>
                              ))}
                              {template.features.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{template.features.length - 2} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Content Configuration */}
          <div>
            <Card className="shadow-lg">
              <CardHeader className="bg-emerald-50 border-b border-emerald-200">
                <CardTitle className="text-emerald-800">Content Details</CardTitle>
                <CardDescription className="text-emerald-700">
                  Configure your new content
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div>
                  <Label htmlFor="title">Content Title *</Label>
                  <Input 
                    id="title"
                    value={contentTitle}
                    onChange={(e) => setContentTitle(e.target.value)}
                    placeholder="Enter content title..."
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea 
                    id="description"
                    value={contentDescription}
                    onChange={(e) => setContentDescription(e.target.value)}
                    placeholder="Brief description of the content..."
                    className="mt-1"
                    rows={3}
                  />
                </div>

                {selectedTemplate && (
                  <>
                    <Separator />
                    <div>
                      <Label className="text-sm font-medium">Selected Template</Label>
                      <div className="mt-2 p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <selectedTemplate.icon className="h-4 w-4 text-emerald-600" />
                          <span className="font-medium text-sm">{selectedTemplate.name}</span>
                        </div>
                        <p className="text-xs text-slate-600 mb-2">{selectedTemplate.description}</p>
                        <div className="space-y-1">
                          <Label className="text-xs">Features:</Label>
                          {selectedTemplate.features.map((feature) => (
                            <div key={feature} className="flex items-center gap-1">
                              <div className="w-1 h-1 bg-emerald-500 rounded-full"></div>
                              <span className="text-xs text-slate-600">{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <Button 
                  onClick={handleCreateContent}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  disabled={!selectedTemplate || !contentTitle.trim()}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Content
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}