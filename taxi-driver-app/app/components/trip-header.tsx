import { Button } from "@/components/ui/button";
import { CheckCircle, AlertTriangle, PhoneCall } from "lucide-react";

function TripHeader({ activeOrder } :{ activeOrder: { fare: number, customerName: string } }) {
  const handleCompleteOrder = () => {}
  const setShowCancelWarning = (show: boolean) => {}
  return (
    <div className="bg-white shadow-lg border-b p-3 z-50">
      <div className="flex flex-col gap-3">
        <Button onClick={handleCompleteOrder} className="w-100 bg-green-600 hover:bg-green-700" size="lg">
          <CheckCircle className="h-5 w-5 mr-2" />
          Complete Trip
        </Button>
        <Button
          onClick={() => setShowCancelWarning(true)}
          variant="outline"
          size="lg"
          className="w-100 text-orange-600 border-orange-200 hover:bg-orange-50"
        >
          <PhoneCall className="h-5 w-5 mr-2" />
          Call to Customer
        </Button>
      </div>

      {/* Trip status bar */}
      <div className="mt-3 flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span className="font-medium text-green-700">Trip Active</span>
      </div>
      <div className="text-right">
        <span className="font-bold text-green-600">${activeOrder.fare}</span>
      </div>
      </div>
    </div>
  )
}

export default TripHeader;