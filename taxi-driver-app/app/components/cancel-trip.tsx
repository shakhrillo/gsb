import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AlertTriangle, PhoneCall } from "lucide-react";
import { Button } from "react-day-picker";

function CancelTrip() {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Cancel Trip?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-red-50 p-4 rounded-lg">
            <p className="text-sm text-red-800 mb-2">
              <strong>Important:</strong> Once accepted, trips cannot be cancelled directly by drivers.
            </p>
            <p className="text-sm text-red-700">
              Cancelling trips may affect your driver rating and account status.
            </p>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800 mb-2">
              <strong>Need to cancel?</strong>
            </p>
            <p className="text-sm text-blue-700">
              Please call our service center for assistance. Our team will help you with legitimate cancellation
              reasons.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Button onClick={handleCallServiceCenter} className="w-full bg-blue-600 hover:bg-blue-700">
              <PhoneCall className="h-4 w-4 mr-2" />
              Call Service Center
            </Button>
            <Button onClick={() => setShowCancelWarning(false)} variant="outline" className="w-full">
              Continue Trip
            </Button>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500">Service Center: +1-800-TAXI-HELP</p>
            <p className="text-xs text-gray-500">Available 24/7</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default CancelTrip;