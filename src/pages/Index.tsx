
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Mic, Lightbulb, AlertCircle, Settings } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import audioDetectionService from "@/services/AudioDetectionService";
import hueService from "@/services/HueService";
import { Drawer, DrawerContent, DrawerTrigger, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

const Index = () => {
  const [isListening, setIsListening] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [setupStep, setSetupStep] = useState<'initial' | 'discover' | 'press_link' | 'complete'>('initial');
  const [sensitivityValue, setSensitivityValue] = useState(15);
  const [bridgeIp, setBridgeIp] = useState('');

  useEffect(() => {
    // Check if already connected to Hue Bridge
    const connected = hueService.isConnected();
    setIsConnected(connected);
    
    if (connected) {
      setSetupStep('complete');
      // Fetch available lights
      hueService.getLights();
    }
    
    // Initialize bridge IP input if available
    const currentBridgeIp = hueService.getBridgeIp();
    if (currentBridgeIp) {
      setBridgeIp(currentBridgeIp);
    }
    
    // Clean up on unmount
    return () => {
      if (isListening) {
        audioDetectionService.stop();
      }
    };
  }, []);

  const handleToggleMicrophone = async () => {
    if (isListening) {
      audioDetectionService.stop();
      setIsListening(false);
      toast({
        title: "Clap detection stopped",
        description: "Microphone is no longer listening for claps."
      });
    } else {
      const success = await audioDetectionService.start(() => {
        handleClapDetected();
      });
      
      if (success) {
        setIsListening(true);
        // Set sensitivity based on slider
        audioDetectionService.setThreshold(sensitivityValue / 100);
        toast({
          title: "Clap detection started",
          description: "Listening for claps to toggle your Hue lights."
        });
      } else {
        toast({
          variant: "destructive",
          title: "Microphone access denied",
          description: "Please grant microphone permissions to use this feature."
        });
      }
    }
  };

  const handleClapDetected = async () => {
    if (!isConnected) {
      toast({
        variant: "destructive",
        title: "Not connected to Hue Bridge",
        description: "Please complete the setup first."
      });
      return;
    }
    
    const success = await hueService.toggleAllLights();
    if (success) {
      toast({
        title: "Lights toggled",
        description: "Your Philips Hue lights have been toggled."
      });
    } else {
      toast({
        variant: "destructive",
        title: "Failed to toggle lights",
        description: "Could not communicate with your Hue Bridge."
      });
    }
  };

  const handleStartSetup = async () => {
    setSetupStep('discover');
    const bridgeIp = await hueService.discoverBridge();
    
    if (bridgeIp) {
      setBridgeIp(bridgeIp);
      setSetupStep('press_link');
    } else {
      toast({
        variant: "destructive",
        title: "No Hue Bridge found",
        description: "Could not discover a Philips Hue Bridge on your network."
      });
    }
  };

  const handleCreateUser = async () => {
    const result = await hueService.createUser();
    
    if (result === 'link_button_not_pressed') {
      toast({
        title: "Press the link button",
        description: "Please press the link button on your Hue Bridge and try again."
      });
    } else if (result) {
      setIsConnected(true);
      setSetupStep('complete');
      toast({
        title: "Connected to Hue Bridge",
        description: "Successfully connected to your Philips Hue Bridge."
      });
      await hueService.getLights();
    } else {
      toast({
        variant: "destructive",
        title: "Connection failed",
        description: "Could not connect to your Hue Bridge."
      });
    }
  };

  const handleManualIpSet = () => {
    if (bridgeIp) {
      hueService.setBridgeIp(bridgeIp);
      setSetupStep('press_link');
      toast({
        title: "IP Address set",
        description: "Manually set Hue Bridge IP address."
      });
    }
  };

  const handleSensitivityChange = (value: number[]) => {
    const newValue = value[0];
    setSensitivityValue(newValue);
    if (isListening) {
      audioDetectionService.setThreshold(newValue / 100);
    }
  };

  const handleReset = () => {
    hueService.reset();
    setIsConnected(false);
    setSetupStep('initial');
    toast({
      title: "Connection reset",
      description: "Hue Bridge connection has been reset."
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-blue-100 p-4">
      <div className="max-w-md mx-auto space-y-6">
        <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-indigo-800">Clap Hue Magic</CardTitle>
            <CardDescription>Control your Philips Hue lights with claps</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isConnected ? (
              <div className="space-y-4">
                {setupStep === 'initial' && (
                  <div className="space-y-4">
                    <Alert variant="default" className="bg-indigo-50 border-indigo-200">
                      <AlertCircle className="h-4 w-4 text-indigo-600" />
                      <AlertTitle>Setup required</AlertTitle>
                      <AlertDescription>
                        Connect to your Philips Hue Bridge to get started.
                      </AlertDescription>
                    </Alert>
                    <Button 
                      onClick={handleStartSetup} 
                      className="w-full bg-indigo-600 hover:bg-indigo-700"
                      size="lg"
                    >
                      <Lightbulb className="mr-2 h-5 w-5" />
                      Connect to Hue Bridge
                    </Button>
                  </div>
                )}
                
                {setupStep === 'discover' && (
                  <div className="space-y-4 text-center">
                    <p className="font-medium">Searching for Hue Bridge...</p>
                    <div className="flex flex-col space-y-3">
                      <Label htmlFor="bridge-ip">Manual Bridge IP (optional):</Label>
                      <Input 
                        id="bridge-ip"
                        value={bridgeIp}
                        onChange={(e) => setBridgeIp(e.target.value)}
                        placeholder="Enter Hue Bridge IP"
                      />
                      <Button onClick={handleManualIpSet} variant="outline">
                        Use this IP
                      </Button>
                    </div>
                  </div>
                )}
                
                {setupStep === 'press_link' && (
                  <div className="space-y-4">
                    <Alert variant="default" className="bg-indigo-50 border-indigo-200">
                      <AlertCircle className="h-4 w-4 text-indigo-600" />
                      <AlertTitle>Press the link button</AlertTitle>
                      <AlertDescription>
                        Press the link button on your Hue Bridge, then click the button below.
                      </AlertDescription>
                    </Alert>
                    <Button 
                      onClick={handleCreateUser} 
                      className="w-full bg-indigo-600 hover:bg-indigo-700"
                      size="lg"
                    >
                      Continue
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center bg-green-50 p-3 rounded-lg border border-green-200">
                  <Lightbulb className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="font-medium text-green-800">Connected to Hue Bridge</p>
                </div>
                
                <Button 
                  onClick={handleToggleMicrophone} 
                  variant={isListening ? "destructive" : "default"}
                  className={`w-full ${isListening ? '' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                  size="lg"
                >
                  <Mic className="mr-2 h-5 w-5" />
                  {isListening ? "Stop Listening" : "Start Listening for Claps"}
                </Button>
                
                <Drawer>
                  <DrawerTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Button>
                  </DrawerTrigger>
                  <DrawerContent>
                    <DrawerHeader>
                      <DrawerTitle>Settings</DrawerTitle>
                    </DrawerHeader>
                    <div className="p-4 space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="sensitivity">Clap Sensitivity: {sensitivityValue}%</Label>
                        <Slider
                          id="sensitivity"
                          defaultValue={[sensitivityValue]}
                          max={30}
                          step={1}
                          onValueChange={handleSensitivityChange}
                        />
                        <p className="text-xs text-muted-foreground">
                          Higher values make the app more sensitive to sounds.
                        </p>
                      </div>
                      
                      <div className="pt-4">
                        <Button variant="destructive" onClick={handleReset} className="w-full">
                          Reset Connection
                        </Button>
                      </div>
                    </div>
                    <DrawerFooter>
                      <p className="text-xs text-center text-muted-foreground">
                        Clap Hue Magic v1.0
                      </p>
                    </DrawerFooter>
                  </DrawerContent>
                </Drawer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
