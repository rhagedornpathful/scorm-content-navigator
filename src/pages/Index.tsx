import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Package, Upload } from 'lucide-react';
import { SCORMPlayer } from '@/components/SCORMPlayer';

const Index = () => {
  const { packageId } = useParams();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950">
      {/* Header Navigation */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img 
                src="/lovable-uploads/2d90e592-5f80-484d-b3c7-2baacd1b6118.png" 
                alt="Pathful" 
                className="h-8 w-auto"
              />
              <h1 className="text-2xl font-bold text-foreground">SCORM Player</h1>
            </div>
            <Button 
              onClick={() => navigate('/packages')}
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Manage Packages
            </Button>
          </div>
        </div>
      </div>

      {packageId ? (
        // Show SCORM Player when packageId is provided
        <SCORMPlayer packageId={packageId} />
      ) : (
        // Show welcome screen when no package is selected
        <div className="container mx-auto px-6 py-16">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-bold mb-6 text-foreground">
              Welcome to Pathful SCORM Player
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              A secure, modern SCORM content player supporting SCORM 1.2 and SCORM 2004 standards
            </p>
            
            <div className="grid md:grid-cols-2 gap-6 mb-12">
              <Card className="p-8 text-left">
                <Upload className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-3">Upload Content</h3>
                <p className="text-muted-foreground mb-4">
                  Upload your SCORM packages and manage your learning content library
                </p>
                <Button 
                  onClick={() => navigate('/packages')}
                  className="w-full"
                >
                  Manage Packages
                </Button>
              </Card>
              
              <Card className="p-8 text-left">
                <Package className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-3">Try Demo</h3>
                <p className="text-muted-foreground mb-4">
                  Experience the SCORM player with built-in demonstration content
                </p>
                <Button 
                  variant="outline"
                  onClick={() => navigate('/player/demo')}
                  className="w-full"
                >
                  Launch Demo
                </Button>
              </Card>
            </div>

            <div className="bg-white/50 dark:bg-slate-900/50 rounded-lg p-6 backdrop-blur-sm">
              <h4 className="font-semibold mb-3">Features</h4>
              <div className="grid md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                <div>✓ SCORM 1.2 & 2004 Support</div>
                <div>✓ Secure Content Execution</div>
                <div>✓ Progress Tracking</div>
                <div>✓ Modern Interface</div>
                <div>✓ Mobile Responsive</div>
                <div>✓ Offline Capable</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
