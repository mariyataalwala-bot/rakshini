import Foundation
import CoreGraphics

func getVisibleWindows() {
    let windowListInfo = CGWindowListCopyWindowInfo([.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID) as! [[String: Any]]
    
    var windowsData: [[String: Any]] = []
    
    for windowInfo in windowListInfo {
        let layer = windowInfo[kCGWindowLayer as String] as? Int ?? 0
        let pid = windowInfo[kCGWindowOwnerPID as String] as? Int ?? 0
        let boundsDict = windowInfo[kCGWindowBounds as String] as? [String: Any]
        
        let x = boundsDict?["X"] as? CGFloat ?? 0
        let y = boundsDict?["Y"] as? CGFloat ?? 0
        let w = boundsDict?["Width"] as? CGFloat ?? 0
        let h = boundsDict?["Height"] as? CGFloat ?? 0
        
        // Only include normal windows and the Dock/Menu
        if layer <= 100 && w > 10 && h > 10 {
            windowsData.append([
                "pid": pid,
                "layer": layer,
                "x": Double(x),
                "y": Double(y),
                "width": Double(w),
                "height": Double(h)
            ])
        }
    }
    
    if let jsonData = try? JSONSerialization.data(withJSONObject: windowsData, options: []),
       let jsonString = String(data: jsonData, encoding: .utf8) {
        print(jsonString)
    } else {
        print("[]")
    }
}

getVisibleWindows()
