import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Upload, 
  FileText, 
  Calendar, 
  HardDrive, 
  Trash2, 
  Play, 
  Download,
  Package,
  AlertCircle,
  CheckCircle2,
  ArrowLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { SCORMPackageManager, type SCORMPackage, type UploadProgress } from '@/lib/scorm-package-manager';

export function PackageManager() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [packages, setPackages] = useState<SCORMPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    try {
      setIsLoading(true);
      const storedPackages = await SCORMPackageManager.getStoredPackages();
      setPackages(storedPackages);
    } catch (error) {
      console.error('Failed to load packages:', error);
      toast({
        title: "Error",
        description: "Failed to load SCORM packages",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(null);

    try {
      const newPackage = await SCORMPackageManager.uploadPackage(
        file,
        (progress) => setUploadProgress(progress)
      );

      setPackages(prev => [newPackage, ...prev]);
      
      toast({
        title: "Upload Successful",
        description: `${newPackage.name} has been uploaded successfully`,
      });

      // Reset file input
      event.target.value = '';
      
    } catch (error) {
      console.error('Upload failed:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload package",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  }, [toast]);

  const handleDeletePackage = async (packageId: string) => {
    try {
      await SCORMPackageManager.deletePackage(packageId);
      setPackages(prev => prev.filter(pkg => pkg.id !== packageId));
      
      toast({
        title: "Package Deleted",
        description: "SCORM package has been removed",
      });
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: "Failed to delete package",
        variant: "destructive"
      });
    }
  };

  const handlePlayPackage = (pkg: SCORMPackage) => {
    // Navigate to player with package ID
    navigate(`/player/${pkg.id}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading packages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Player
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <img 
                src="/lovable-uploads/2d90e592-5f80-484d-b3c7-2baacd1b6118.png" 
                alt="Pathful" 
                className="h-8 w-auto"
              />
              SCORM Package Manager
            </h1>
            <p className="text-muted-foreground mt-1">Upload and manage your SCORM content packages</p>
          </div>
        </div>

        {/* Upload Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload SCORM Package
            </CardTitle>
            <CardDescription>
              Upload ZIP files containing SCORM 1.2 or SCORM 2004 content packages
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <div className="space-y-2">
                  <p className="text-sm font-medium">Choose SCORM package to upload</p>
                  <p className="text-xs text-muted-foreground">
                    Supports ZIP files up to 100MB containing imsmanifest.xml
                  </p>
                </div>
                <input
                  type="file"
                  accept=".zip"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                  id="scorm-upload"
                />
                <label htmlFor="scorm-upload">
                  <Button
                    variant="outline"
                    className="mt-4"
                    disabled={uploading}
                    asChild
                  >
                    <span className="cursor-pointer">
                      {uploading ? 'Uploading...' : 'Select ZIP File'}
                    </span>
                  </Button>
                </label>
              </div>

              {/* Upload Progress */}
              {uploadProgress && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium capitalize">
                          {uploadProgress.stage.replace('_', ' ')}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {uploadProgress.progress}%
                        </span>
                      </div>
                      <Progress value={uploadProgress.progress} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        {uploadProgress.message}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Package List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Uploaded Packages ({packages.length})
            </CardTitle>
            <CardDescription>
              Manage your uploaded SCORM content packages
            </CardDescription>
          </CardHeader>
          <CardContent>
            {packages.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">No packages uploaded</h3>
                <p className="text-muted-foreground mb-4">
                  Upload your first SCORM package to get started
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {packages.map((pkg) => (
                    <Card key={pkg.id} className="transition-all hover:shadow-md">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                              <h3 className="font-semibold truncate">{pkg.name}</h3>
                              <Badge variant="secondary" className="ml-auto">
                                {pkg.manifest.version || 'SCORM 1.2'}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span>
                                  {pkg.uploadDate.toLocaleDateString()}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <HardDrive className="h-4 w-4" />
                                <span>
                                  {SCORMPackageManager.formatFileSize(pkg.size)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                <span>Ready to play</span>
                              </div>
                            </div>

                            {pkg.manifest.title && (
                              <p className="text-sm text-muted-foreground mb-3">
                                {pkg.manifest.title}
                              </p>
                            )}

                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                onClick={() => handlePlayPackage(pkg)}
                                className="flex items-center gap-2"
                              >
                                <Play className="h-4 w-4" />
                                Launch Course
                              </Button>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeletePackage(pkg.id)}
                                className="flex items-center gap-2 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}