"use client";

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useTranslation } from 'react-i18next';
import { 
  MapPin, 
  FileText, 
  Camera, 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  Users, 
  Globe, 
  Languages,
  Target,
  Clock,
  Star,
  HelpCircle,
  BookOpen,
  Video,
  MessageSquare
} from 'lucide-react';

interface UserGuideDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserGuideDialog({ isOpen, onClose }: UserGuideDialogProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('overview');

  const guideSteps = [
    {
      id: 'location',
      title: t('user_guide.steps.location.title', { defaultValue: 'Select Location' }),
      description: t('user_guide.steps.location.description', { 
        defaultValue: 'Click on the map to select the exact location where you found the issue' 
      }),
      icon: MapPin,
      details: [
        t('user_guide.steps.location.detail1', { defaultValue: 'Use the map to navigate to the problem area' }),
        t('user_guide.steps.location.detail2', { defaultValue: 'Click precisely on the location with the issue' }),
        t('user_guide.steps.location.detail3', { defaultValue: 'The system will automatically detect the province and coordinates' }),
        t('user_guide.steps.location.detail4', { defaultValue: 'You can zoom in for more precise location selection' })
      ]
    },
    {
      id: 'category',
      title: t('user_guide.steps.category.title', { defaultValue: 'Choose Issue Category' }),
      description: t('user_guide.steps.category.description', { 
        defaultValue: 'Select the type of map issue you want to report' 
      }),
      icon: Target,
      details: [
        t('user_guide.steps.category.detail1', { defaultValue: 'First select a violation group (e.g., Place Information, Road Data)' }),
        t('user_guide.steps.category.detail2', { defaultValue: 'Then choose specific issue types that apply' }),
        t('user_guide.steps.category.detail3', { defaultValue: 'You can select multiple issue types if relevant' }),
        t('user_guide.steps.category.detail4', { defaultValue: 'Use "General" for issues not covered by other categories' })
      ]
    },
    {
      id: 'description',
      title: t('user_guide.steps.description.title', { defaultValue: 'Describe the Issue' }),
      description: t('user_guide.steps.description.description', { 
        defaultValue: 'Provide a clear and detailed description of the problem' 
      }),
      icon: FileText,
      details: [
        t('user_guide.steps.description.detail1', { defaultValue: 'Write at least 10 characters describing the issue' }),
        t('user_guide.steps.description.detail2', { defaultValue: 'Be specific about what is wrong or missing' }),
        t('user_guide.steps.description.detail3', { defaultValue: 'Include what the correct information should be' }),
        t('user_guide.steps.description.detail4', { defaultValue: 'Use clear language that others can understand' })
      ]
    },
    {
      id: 'languages',
      title: t('user_guide.steps.languages.title', { defaultValue: 'Add Language Information' }),
      description: t('user_guide.steps.languages.description', { 
        defaultValue: 'Provide names in English, Khmer, and Thai languages' 
      }),
      icon: Languages,
      details: [
        t('user_guide.steps.languages.detail1', { defaultValue: 'Enter the correct name in English if available' }),
        t('user_guide.steps.languages.detail2', { defaultValue: 'Add the native Khmer name for local accuracy' }),
        t('user_guide.steps.languages.detail3', { defaultValue: 'Include Thai name if the location has one' }),
        t('user_guide.steps.languages.detail4', { defaultValue: 'Use translation buttons to help with language conversion' })
      ]
    },
    {
      id: 'details',
      title: t('user_guide.steps.details.title', { defaultValue: 'Additional Details' }),
      description: t('user_guide.steps.details.description', { 
        defaultValue: 'Set priority, add notes, and provide additional context' 
      }),
      icon: Info,
      details: [
        t('user_guide.steps.details.detail1', { defaultValue: 'Set priority level: Low, Medium, or High' }),
        t('user_guide.steps.details.detail2', { defaultValue: 'Add any additional notes or context' }),
        t('user_guide.steps.details.detail3', { defaultValue: 'Include links to supporting documentation if available' }),
        t('user_guide.steps.details.detail4', { defaultValue: 'Review all information before submitting' })
      ]
    },
    {
      id: 'submit',
      title: t('user_guide.steps.submit.title', { defaultValue: 'Submit Report' }),
      description: t('user_guide.steps.submit.description', { 
        defaultValue: 'Review and submit your report for processing' 
      }),
      icon: CheckCircle,
      details: [
        t('user_guide.steps.submit.detail1', { defaultValue: 'Review all entered information for accuracy' }),
        t('user_guide.steps.submit.detail2', { defaultValue: 'The system will check for duplicate reports' }),
        t('user_guide.steps.submit.detail3', { defaultValue: 'Confirm submission if no duplicates are found' }),
        t('user_guide.steps.submit.detail4', { defaultValue: 'Track your report status in the Records section' })
      ]
    }
  ];

  const tips = [
    {
      icon: Star,
      title: t('user_guide.tips.accuracy.title', { defaultValue: 'Be Accurate' }),
      description: t('user_guide.tips.accuracy.description', { 
        defaultValue: 'Precise location and detailed descriptions help resolve issues faster' 
      })
    },
    {
      icon: Camera,
      title: t('user_guide.tips.evidence.title', { defaultValue: 'Provide Evidence' }),
      description: t('user_guide.tips.evidence.description', { 
        defaultValue: 'Include links to photos or documentation when possible' 
      })
    },
    {
      icon: Users,
      title: t('user_guide.tips.community.title', { defaultValue: 'Community First' }),
      description: t('user_guide.tips.community.description', { 
        defaultValue: 'Check if someone else has already reported the same issue' 
      })
    },
    {
      icon: Clock,
      title: t('user_guide.tips.patience.title', { defaultValue: 'Be Patient' }),
      description: t('user_guide.tips.patience.description', { 
        defaultValue: 'Reports are reviewed by volunteers and may take time to process' 
      })
    }
  ];

  const faq = [
    {
      question: t('user_guide.faq.q1.question', { defaultValue: 'How long does it take to process a report?' }),
      answer: t('user_guide.faq.q1.answer', { 
        defaultValue: 'Reports are typically reviewed within 1-7 days, depending on complexity and volunteer availability.' 
      })
    },
    {
      question: t('user_guide.faq.q2.question', { defaultValue: 'Can I edit my report after submission?' }),
      answer: t('user_guide.faq.q2.answer', { 
        defaultValue: 'Yes, you can edit your reports from the Records page before they are approved.' 
      })
    },
    {
      question: t('user_guide.faq.q3.question', { defaultValue: 'What happens if my report is rejected?' }),
      answer: t('user_guide.faq.q3.answer', { 
        defaultValue: 'Rejected reports include feedback explaining why. You can revise and resubmit with corrections.' 
      })
    },
    {
      question: t('user_guide.faq.q4.question', { defaultValue: 'How do I know if my report was successful?' }),
      answer: t('user_guide.faq.q4.answer', { 
        defaultValue: 'Check the Records page to see your report status and any updates from reviewers.' 
      })
    },
    {
      question: t('user_guide.faq.q5.question', { defaultValue: 'Can I report issues in multiple languages?' }),
      answer: t('user_guide.faq.q5.answer', { 
        defaultValue: 'Yes! Providing names in English, Khmer, and Thai helps make maps more accessible to everyone.' 
      })
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            {t('user_guide.title', { defaultValue: 'How to Submit a Report to MapKH' })}
          </DialogTitle>
          <DialogDescription>
            {t('user_guide.description', { 
              defaultValue: 'Complete guide to reporting map issues and contributing to better maps for Cambodia' 
            })}
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">{t('user_guide.tabs.overview', { defaultValue: 'Overview' })}</TabsTrigger>
            <TabsTrigger value="steps">{t('user_guide.tabs.steps', { defaultValue: 'Step by Step' })}</TabsTrigger>
            <TabsTrigger value="tips">{t('user_guide.tabs.tips', { defaultValue: 'Tips & Best Practices' })}</TabsTrigger>
            <TabsTrigger value="faq">{t('user_guide.tabs.faq', { defaultValue: 'FAQ' })}</TabsTrigger>
          </TabsList>
          
          <ScrollArea className="h-[60vh] mt-4">
            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    {t('user_guide.overview.welcome.title', { defaultValue: 'Welcome to MapKH' })}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    {t('user_guide.overview.welcome.description', { 
                      defaultValue: 'MapKH is a community-driven platform for improving map data in Cambodia. Your reports help make maps more accurate and useful for everyone.' 
                    })}
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        {t('user_guide.overview.what_to_report.title', { defaultValue: 'What to Report' })}
                      </h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• {t('user_guide.overview.what_to_report.item1', { defaultValue: 'Incorrect place names or information' })}</li>
                        <li>• {t('user_guide.overview.what_to_report.item2', { defaultValue: 'Missing or wrong addresses' })}</li>
                        <li>• {t('user_guide.overview.what_to_report.item3', { defaultValue: 'Outdated business information' })}</li>
                        <li>• {t('user_guide.overview.what_to_report.item4', { defaultValue: 'Road and navigation issues' })}</li>
                        <li>• {t('user_guide.overview.what_to_report.item5', { defaultValue: 'Language and translation errors' })}</li>
                      </ul>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-semibold flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        {t('user_guide.overview.process.title', { defaultValue: 'Report Process' })}
                      </h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• {t('user_guide.overview.process.step1', { defaultValue: 'Submit your report with details' })}</li>
                        <li>• {t('user_guide.overview.process.step2', { defaultValue: 'Community volunteers review it' })}</li>
                        <li>• {t('user_guide.overview.process.step3', { defaultValue: 'Approved reports are processed' })}</li>
                        <li>• {t('user_guide.overview.process.step4', { defaultValue: 'Maps are updated with corrections' })}</li>
                        <li>• {t('user_guide.overview.process.step5', { defaultValue: 'Everyone benefits from better maps' })}</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    {t('user_guide.overview.important.title', { defaultValue: 'Important Guidelines' })}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Badge variant="destructive" className="w-fit">
                        {t('user_guide.overview.important.dont.title', { defaultValue: "Don't Report" })}
                      </Badge>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• {t('user_guide.overview.important.dont.item1', { defaultValue: 'Personal information or private data' })}</li>
                        <li>• {t('user_guide.overview.important.dont.item2', { defaultValue: 'Spam or irrelevant content' })}</li>
                        <li>• {t('user_guide.overview.important.dont.item3', { defaultValue: 'Duplicate reports (check first!)' })}</li>
                      </ul>
                    </div>
                    
                    <div className="space-y-2">
                      <Badge variant="default" className="w-fit">
                        {t('user_guide.overview.important.do.title', { defaultValue: "Do Report" })}
                      </Badge>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• {t('user_guide.overview.important.do.item1', { defaultValue: 'Factual, verifiable information' })}</li>
                        <li>• {t('user_guide.overview.important.do.item2', { defaultValue: 'Clear, detailed descriptions' })}</li>
                        <li>• {t('user_guide.overview.important.do.item3', { defaultValue: 'Respectful, constructive feedback' })}</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="steps" className="space-y-4">
              {guideSteps.map((step, index) => (
                <Card key={step.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                        {index + 1}
                      </div>
                      <step.icon className="h-5 w-5" />
                      {step.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">{step.description}</p>
                    <div className="space-y-2">
                      {step.details.map((detail, detailIndex) => (
                        <div key={detailIndex} className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{detail}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
            
            <TabsContent value="tips" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tips.map((tip, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <tip.icon className="h-5 w-5 text-primary" />
                        {tip.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{tip.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    {t('user_guide.tips.writing.title', { defaultValue: 'Writing Effective Descriptions' })}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Badge variant="default" className="mb-2">
                        {t('user_guide.tips.writing.good.title', { defaultValue: 'Good Example' })}
                      </Badge>
                      <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-md border border-green-200 dark:border-green-800">
                        <p className="text-sm">
                          {t('user_guide.tips.writing.good.example', { 
                            defaultValue: '"The restaurant name is shown as \'Old Name\' but it has been renamed to \'New Restaurant Name\' since 2023. The correct Khmer name is \'ឈ្មោះថ្មី\' and it serves traditional Cambodian cuisine."' 
                          })}
                        </p>
                      </div>
                    </div>
                    
                    <div>
                      <Badge variant="destructive" className="mb-2">
                        {t('user_guide.tips.writing.bad.title', { defaultValue: 'Poor Example' })}
                      </Badge>
                      <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded-md border border-red-200 dark:border-red-800">
                        <p className="text-sm">
                          {t('user_guide.tips.writing.bad.example', { 
                            defaultValue: '"Wrong name"' 
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="faq" className="space-y-4">
              {faq.map((item, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <HelpCircle className="h-4 w-4" />
                      {item.question}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{item.answer}</p>
                  </CardContent>
                </Card>
              ))}
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    {t('user_guide.faq.support.title', { defaultValue: 'Need More Help?' })}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t('user_guide.faq.support.description', { 
                      defaultValue: 'If you have questions not covered here, you can:' 
                    })}
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li>• {t('user_guide.faq.support.option1', { defaultValue: 'Check the community discussions in the Teams section' })}</li>
                    <li>• {t('user_guide.faq.support.option2', { defaultValue: 'Look at examples from other approved reports' })}</li>
                    <li>• {t('user_guide.faq.support.option3', { defaultValue: 'Start with simple reports to learn the process' })}</li>
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>
        
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button onClick={onClose}>
            {t('user_guide.close', { defaultValue: 'Close Guide' })}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}