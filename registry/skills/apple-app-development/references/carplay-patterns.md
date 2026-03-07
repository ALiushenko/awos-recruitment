# CarPlay Patterns Reference

## Contents
- Overview (iPhone projection, app categories, entitlements)
- CarPlay app lifecycle (`CPTemplateApplicationSceneDelegate`, scene-based, multi-screen)
- CPTemplate API (template hierarchy, constraints, navigation)
- Navigation apps (`CPMapTemplate`, `CPNavigationSession`, maneuvers)
- Audio / media apps (`CPNowPlayingTemplate`, `MPRemoteCommandCenter`)
- Communication apps (messaging, VoIP, SiriKit intents)
- EV charging, fueling, parking (`CPPointOfInterestTemplate`)
- Quick food ordering (menu flow with templates)
- Driving task apps (minimal UI, distraction guidelines)
- Design guidelines (HIG, driver distraction, dark mode)
- Testing (CarPlay Simulator, physical units)
- Entitlements and App Review

## Overview

CarPlay projects an iPhone app's interface onto the car's built-in display. The app runs on the iPhone — the car screen is an external display driven by the CarPlay framework. All rendering, logic, and data stay on the phone.

CarPlay apps use a **template-based UI** (not SwiftUI or UIKit views). Apple provides a fixed set of `CPTemplate` subclasses. This constraint exists to minimize driver distraction — apps cannot draw arbitrary UI on the car screen.

### Supported app types

Each type requires a specific entitlement. You must request the entitlement from Apple before you can develop or submit the app.

| App Type | Entitlement | Primary Templates |
|----------|------------|-------------------|
| Navigation | `com.apple.developer.carplay-maps` | `CPMapTemplate`, `CPSearchTemplate` |
| Audio / Media | `com.apple.developer.carplay-audio` | `CPListTemplate`, `CPNowPlayingTemplate`, `CPTabBarTemplate` |
| Communication (Messaging) | `com.apple.developer.carplay-messaging` | `CPListTemplate`, `CPContactTemplate` |
| Communication (VoIP) | `com.apple.developer.carplay-voip` | `CPListTemplate`, `CPContactTemplate` |
| EV Charging | `com.apple.developer.carplay-charging` | `CPPointOfInterestTemplate`, `CPInformationTemplate` |
| Fueling | `com.apple.developer.carplay-fueling` | `CPPointOfInterestTemplate`, `CPInformationTemplate` |
| Parking | `com.apple.developer.carplay-parking` | `CPPointOfInterestTemplate`, `CPInformationTemplate` |
| Quick Food Ordering | `com.apple.developer.carplay-quick-ordering` | `CPListTemplate`, `CPInformationTemplate` |
| Driving Task | `com.apple.developer.carplay-driving-task` | `CPListTemplate`, `CPGridTemplate` |

A single app can hold multiple CarPlay entitlements if it spans categories (e.g., navigation + EV charging).

## CarPlay App Lifecycle

CarPlay uses the UIScene architecture. The car display is a separate `UIScene` from the phone display, and both can run simultaneously.

### CPTemplateApplicationSceneDelegate

This is the main entry point for your CarPlay interface. Declare it in `Info.plist` under the CarPlay scene configuration.

```swift
import CarPlay

final class CarPlaySceneDelegate: UIResponder, CPTemplateApplicationSceneDelegate {
    var interfaceController: CPInterfaceController?

    // Called when CarPlay connects
    func templateApplicationScene(
        _ templateApplicationScene: CPTemplateApplicationScene,
        didConnect interfaceController: CPInterfaceController
    ) {
        self.interfaceController = interfaceController

        let listItem = CPListItem(text: "Now Playing", detailText: "Currently streaming")
        let section = CPListSection(items: [listItem])
        let listTemplate = CPListTemplate(title: "My App", sections: [section])

        interfaceController.setRootTemplate(listTemplate, animated: true, completion: nil)
    }

    // Called when CarPlay disconnects
    func templateApplicationScene(
        _ templateApplicationScene: CPTemplateApplicationScene,
        didDisconnectInterfaceController interfaceController: CPInterfaceController
    ) {
        self.interfaceController = nil
    }
}
```

### Info.plist scene configuration

```xml
<key>UIApplicationSceneManifest</key>
<dict>
    <key>UISceneConfigurations</key>
    <dict>
        <!-- Phone scene -->
        <key>UIWindowSceneSessionRoleApplication</key>
        <array>
            <dict>
                <key>UISceneConfigurationName</key>
                <string>Phone</string>
                <key>UISceneDelegateClassName</key>
                <string>$(PRODUCT_MODULE_NAME).PhoneSceneDelegate</string>
            </dict>
        </array>
        <!-- CarPlay scene -->
        <key>CPTemplateApplicationSceneSessionRoleApplication</key>
        <array>
            <dict>
                <key>UISceneConfigurationName</key>
                <string>CarPlay</string>
                <key>UISceneDelegateClassName</key>
                <string>$(PRODUCT_MODULE_NAME).CarPlaySceneDelegate</string>
            </dict>
        </array>
    </dict>
</dict>
```

### Multi-screen considerations

- The phone and car scenes are independent. Your app can show different content on each screen.
- Shared state (playback position, navigation progress) should live in a shared model layer, not in either scene delegate.
- Both scenes receive lifecycle callbacks independently. A user might lock the phone while CarPlay remains active.
- Do not assume the phone screen is visible when CarPlay is connected.

## CPTemplate API

### Template hierarchy

All CarPlay UI is built from `CPTemplate` subclasses. You do not create custom views.

| Template | Purpose |
|----------|---------|
| `CPTabBarTemplate` | Top-level tab bar (max 4–5 tabs depending on app type) |
| `CPListTemplate` | Scrollable list of items with sections |
| `CPGridTemplate` | Grid of buttons (max 8 items) |
| `CPInformationTemplate` | Detail view with labels and actions |
| `CPPointOfInterestTemplate` | Map with annotated locations |
| `CPSearchTemplate` | Search field with results list |
| `CPNowPlayingTemplate` | Media playback controls (singleton) |
| `CPMapTemplate` | Full map for navigation apps |
| `CPContactTemplate` | Contact card for communication apps |
| `CPActionSheetTemplate` | Action sheet overlay |
| `CPAlertTemplate` | Alert dialog overlay |

### Template constraints

- **Tab bar**: Maximum 4 tabs for most app types, 5 for audio apps.
- **List template**: Maximum 2 levels of nesting (root list + detail). Sections have no hard item limit, but Apple recommends keeping lists short for glanceability.
- **Grid template**: Maximum 8 buttons.
- **Navigation stack depth**: Keep it shallow — typically root + 1 pushed template. Deep stacks are rejected in App Review.
- **Text length**: Titles and detail text are truncated by the system. Design for short strings.

### CPInterfaceController

The interface controller manages the template navigation stack (push, pop, set root).

```swift
// Push a detail template
let detailTemplate = CPInformationTemplate(
    title: "Station Details",
    layout: .leading,
    items: [
        CPInformationItem(title: "Address", detail: "123 Main St"),
        CPInformationItem(title: "Hours", detail: "24/7")
    ],
    actions: [
        CPTextButton(title: "Start Navigation", textStyle: .confirm) { _ in
            // handle action
        }
    ]
)
interfaceController?.pushTemplate(detailTemplate, animated: true, completion: nil)

// Pop back
interfaceController?.popTemplate(animated: true, completion: nil)

// Pop to root
interfaceController?.popToRootTemplate(animated: true, completion: nil)
```

### Updating templates with new data

Templates are mutable after creation. Update items in place rather than replacing the entire template:

```swift
// Update list items dynamically
let updatedItems = stations.map { station in
    CPListItem(text: station.name, detailText: station.distance)
}
let updatedSection = CPListSection(items: updatedItems)
listTemplate.updateSections([updatedSection])
```

## Navigation Apps

Navigation apps use `CPMapTemplate` to display a full-screen map and provide turn-by-turn guidance.

### CPMapTemplate setup

```swift
final class CarPlayNavigationDelegate: UIResponder, CPTemplateApplicationSceneDelegate {
    var interfaceController: CPInterfaceController?
    private var mapTemplate: CPMapTemplate!

    func templateApplicationScene(
        _ templateApplicationScene: CPTemplateApplicationScene,
        didConnect interfaceController: CPInterfaceController
    ) {
        self.interfaceController = interfaceController

        mapTemplate = CPMapTemplate()
        mapTemplate.mapDelegate = self

        // Add map buttons (zoom, recenter, etc.)
        let zoomInButton = CPMapButton { [weak self] _ in
            self?.zoomIn()
        }
        zoomInButton.image = UIImage(systemName: "plus.magnifyingglass")

        let zoomOutButton = CPMapButton { [weak self] _ in
            self?.zoomOut()
        }
        zoomOutButton.image = UIImage(systemName: "minus.magnifyingglass")

        mapTemplate.mapButtons = [zoomInButton, zoomOutButton]

        interfaceController.setRootTemplate(mapTemplate, animated: true, completion: nil)
    }
}
```

### Map rendering

Your app is responsible for rendering the map. Use `CPMapTemplate`'s `showPanningInterface` for pan mode, but the actual map rendering happens in a `UIWindow` you create on the CarPlay screen's `UIScene`:

```swift
func templateApplicationScene(
    _ templateApplicationScene: CPTemplateApplicationScene,
    didConnect interfaceController: CPInterfaceController
) {
    // Create a window on the CarPlay screen
    let carPlayWindow = UIWindow(windowScene: templateApplicationScene)
    let mapViewController = CarPlayMapViewController()
    carPlayWindow.rootViewController = mapViewController
    carPlayWindow.makeKeyAndVisible()
    self.carPlayWindow = carPlayWindow

    // Set up templates on top of the map
    // ...
}
```

### CPNavigationSession and CPManeuver

```swift
func startNavigation(to destination: CLLocationCoordinate2D) {
    let trip = CPTrip(
        origin: MKMapItem.forCurrentLocation(),
        destination: MKMapItem(placemark: MKPlacemark(coordinate: destination)),
        routeChoices: [
            CPRouteChoice(
                summaryVariants: ["Fastest Route", "Fast"],
                additionalInformationVariants: ["via Highway 101"],
                selectionSummaryVariants: ["25 min, 18 mi"]
            )
        ]
    )

    mapTemplate.showTripPreviews([trip]) { trip, error in
        // User selected a trip — start navigation
    }
}

// When the user confirms a route:
func beginTrip(_ trip: CPTrip, routeChoice: CPRouteChoice) {
    let session = mapTemplate.startNavigationSession(for: trip)

    // Provide the first maneuver
    let maneuver = CPManeuver()
    maneuver.instructionVariants = ["Turn right onto Main Street", "Turn right"]
    maneuver.initialTravelEstimates = CPTravelEstimates(
        distanceRemaining: Measurement(value: 500, unit: .meters),
        timeRemaining: 45
    )
    maneuver.symbolImage = UIImage(systemName: "arrow.turn.up.right")

    session.upcomingManeuvers = [maneuver]
    session.pauseTrip(for: .rerouting, description: nil, turnCardColor: nil)
    session.finishTrip()
}
```

### Real-time guidance updates

```swift
// Update travel estimates as the user drives
func updateEstimates(session: CPNavigationSession, maneuver: CPManeuver) {
    let estimates = CPTravelEstimates(
        distanceRemaining: Measurement(value: 200, unit: .meters),
        timeRemaining: 20
    )
    session.updateEstimates(estimates, for: maneuver)
}
```

### CPMapDelegate

```swift
extension CarPlayNavigationDelegate: CPMapTemplateDelegate {
    func mapTemplate(
        _ mapTemplate: CPMapTemplate,
        panBeganWith direction: CPMapTemplate.PanDirection
    ) {
        // User started panning — update map viewport
    }

    func mapTemplate(
        _ mapTemplate: CPMapTemplate,
        panEndedWith direction: CPMapTemplate.PanDirection
    ) {
        // Panning ended
    }

    func mapTemplate(
        _ mapTemplate: CPMapTemplate,
        selectedPreviewFor trip: CPTrip,
        using routeChoice: CPRouteChoice
    ) {
        // User selected a trip preview — highlight route on map
    }

    func mapTemplate(
        _ mapTemplate: CPMapTemplate,
        startedTrip trip: CPTrip,
        using routeChoice: CPRouteChoice
    ) {
        // Begin turn-by-turn guidance
        beginTrip(trip, routeChoice: routeChoice)
    }
}
```

## Audio / Media Apps

### CPNowPlayingTemplate

`CPNowPlayingTemplate` is a singleton. You do not create it — you access the shared instance and configure it.

```swift
func setupNowPlaying() {
    let nowPlayingTemplate = CPNowPlayingTemplate.shared

    // Add custom buttons (max 4 besides the default playback controls)
    let repeatButton = CPNowPlayingRepeatButton { _ in
        // Toggle repeat mode
    }
    let shuffleButton = CPNowPlayingShuffleButton { _ in
        // Toggle shuffle mode
    }
    nowPlayingTemplate.updateNowPlayingButtons([shuffleButton, repeatButton])
}
```

### Integration with MPNowPlayingInfoCenter and MPRemoteCommandCenter

CarPlay reads playback metadata and controls from the standard `MediaPlayer` framework. This is the same integration you use for lock screen and Control Center controls:

```swift
import MediaPlayer

func updateNowPlayingInfo(track: Track) {
    var info = [String: Any]()
    info[MPMediaItemPropertyTitle] = track.title
    info[MPMediaItemPropertyArtist] = track.artist
    info[MPMediaItemPropertyPlaybackDuration] = track.duration
    info[MPNowPlayingInfoPropertyElapsedPlaybackTime] = track.currentTime

    if let artwork = track.artworkImage {
        info[MPMediaItemPropertyArtwork] = MPMediaItemArtwork(
            boundsSize: artwork.size
        ) { _ in artwork }
    }

    MPNowPlayingInfoCenter.default().nowPlayingInfo = info
}

func configureRemoteCommands() {
    let commandCenter = MPRemoteCommandCenter.shared()

    commandCenter.playCommand.addTarget { _ in
        AudioPlayer.shared.play()
        return .success
    }
    commandCenter.pauseCommand.addTarget { _ in
        AudioPlayer.shared.pause()
        return .success
    }
    commandCenter.nextTrackCommand.addTarget { _ in
        AudioPlayer.shared.nextTrack()
        return .success
    }
    commandCenter.previousTrackCommand.addTarget { _ in
        AudioPlayer.shared.previousTrack()
        return .success
    }
}
```

### Browsable content hierarchy

Audio apps typically present a browsable hierarchy using `CPListTemplate` with a `CPTabBarTemplate` at the root:

```swift
func buildAudioBrowseInterface() -> CPTabBarTemplate {
    let recentSection = CPListSection(
        items: recentTracks.map { track in
            let item = CPListItem(text: track.title, detailText: track.artist)
            item.handler = { [weak self] _, completion in
                self?.playTrack(track)
                completion()
            }
            item.accessoryType = .disclosureIndicator
            return item
        },
        header: "Recent"
    )
    let recentsTab = CPListTemplate(title: "Recents", sections: [recentSection])
    recentsTab.tabImage = UIImage(systemName: "clock")

    let playlistsTab = CPListTemplate(title: "Playlists", sections: [/* ... */])
    playlistsTab.tabImage = UIImage(systemName: "music.note.list")

    let searchTab = CPSearchTemplate()
    searchTab.delegate = self

    let tabBar = CPTabBarTemplate(templates: [recentsTab, playlistsTab, searchTab])
    return tabBar
}
```

## Communication Apps

### Messaging with SiriKit

CarPlay messaging apps rely on SiriKit. The user interacts through Siri voice commands — the app provides the intent handling. CarPlay displays message lists but the actual send/read flow goes through `INSendMessageIntent` and `INSearchForMessagesIntent`.

```swift
// IntentHandler for messaging
final class MessageIntentHandler: NSObject, INSendMessageIntentHandling {
    func handle(
        intent: INSendMessageIntent,
        completion: @escaping (INSendMessageIntentResponse) -> Void
    ) {
        guard let recipients = intent.recipients,
              let content = intent.content else {
            completion(INSendMessageIntentResponse(code: .failure, userActivity: nil))
            return
        }

        MessageService.shared.send(content: content, to: recipients) { success in
            let code: INSendMessageIntentResponseCode = success ? .success : .failure
            completion(INSendMessageIntentResponse(code: code, userActivity: nil))
        }
    }

    func resolveRecipients(
        for intent: INSendMessageIntent,
        with completion: @escaping ([INSendMessageRecipientResolutionResult]) -> Void
    ) {
        guard let recipients = intent.recipients else {
            completion([.needsValue()])
            return
        }
        let results = recipients.map { INSendMessageRecipientResolutionResult.success(with: $0) }
        completion(results)
    }
}
```

### Message list in CarPlay

```swift
func buildMessageList() -> CPListTemplate {
    let items = conversations.map { convo in
        let item = CPMessageListItem(
            conversationIdentifier: convo.id,
            text: convo.lastMessage,
            leadingConfiguration: CPMessageListItem.LeadingConfiguration(
                leadingItem: .init(text: convo.senderInitials, isUnread: convo.isUnread)
            ),
            trailingConfiguration: nil,
            trailingText: convo.timestamp
        )
        return item
    }
    return CPListTemplate(title: "Messages", sections: [CPListSection(items: items)])
}
```

### VoIP calling

VoIP apps use CallKit alongside CarPlay. The CarPlay interface shows call controls, but call management flows through `CXProvider` and `CXCallController`:

```swift
import CallKit

final class VoIPCallManager {
    private let provider: CXProvider
    private let callController = CXCallController()

    init() {
        let config = CXProviderConfiguration()
        config.supportsVideo = false
        config.maximumCallsPerCallGroup = 1
        config.supportedHandleTypes = [.phoneNumber, .generic]
        provider = CXProvider(configuration: config)
    }

    func startCall(to contact: String) {
        let handle = CXHandle(type: .generic, value: contact)
        let startAction = CXStartCallAction(
            call: UUID(),
            handle: handle
        )
        callController.request(CXTransaction(action: startAction)) { error in
            if let error { print("Start call failed: \(error)") }
        }
    }
}
```

## EV Charging, Fueling, Parking

These app types use `CPPointOfInterestTemplate` to show locations on a map with detail cards.

### CPPointOfInterestTemplate

```swift
func buildChargingStationsTemplate() -> CPPointOfInterestTemplate {
    let stations = chargingStations.map { station in
        let location = MKMapItem(
            placemark: MKPlacemark(coordinate: station.coordinate)
        )
        let poi = CPPointOfInterest(
            location: location,
            title: station.name,
            subtitle: station.availabilityText,
            summary: "\(station.powerKW) kW - \(station.pricePerKWh)/kWh",
            detailTitle: station.name,
            detailSubtitle: station.address,
            detailSummary: "Connectors: \(station.connectorTypes.joined(separator: ", "))",
            pinImage: UIImage(systemName: "bolt.car")
        )
        poi.primaryButton = CPTextButton(
            title: "Navigate",
            textStyle: .confirm
        ) { _ in
            // Open directions
        }
        poi.secondaryButton = CPTextButton(
            title: "Details",
            textStyle: .normal
        ) { _ in
            // Show detail template
        }
        return poi
    }

    let template = CPPointOfInterestTemplate(
        title: "Charging Stations",
        pointsOfInterest: stations,
        selectedIndex: NSNotFound
    )
    template.pointOfInterestDelegate = self
    return template
}
```

### Delegate for region changes

```swift
extension CarPlaySceneDelegate: CPPointOfInterestTemplateDelegate {
    func pointOfInterestTemplate(
        _ template: CPPointOfInterestTemplate,
        didChangeMapRegion region: MKCoordinateRegion
    ) {
        // Fetch new stations for the visible region
        fetchStations(in: region) { stations in
            let pois = stations.map { /* build CPPointOfInterest */ }
            template.setPointsOfInterest(pois, selectedIndex: NSNotFound)
        }
    }
}
```

## Quick Food Ordering

Quick food ordering apps present a menu using `CPListTemplate` and guide the user through a short order flow.

```swift
func buildMenuTemplate() -> CPListTemplate {
    let menuItems = menuCategories.map { category in
        let item = CPListItem(
            text: category.name,
            detailText: "\(category.items.count) items"
        )
        item.accessoryType = .disclosureIndicator
        item.handler = { [weak self] _, completion in
            self?.showCategoryItems(category)
            completion()
        }
        return item
    }

    return CPListTemplate(
        title: "Order Food",
        sections: [CPListSection(items: menuItems)]
    )
}

func showCategoryItems(_ category: MenuCategory) {
    let items = category.items.map { menuItem in
        let item = CPListItem(
            text: menuItem.name,
            detailText: "$\(menuItem.price)"
        )
        item.handler = { [weak self] _, completion in
            self?.addToOrder(menuItem)
            completion()
        }
        return item
    }

    let template = CPListTemplate(
        title: category.name,
        sections: [CPListSection(items: items)]
    )
    interfaceController?.pushTemplate(template, animated: true, completion: nil)
}
```

Keep the order flow to 2–3 screens maximum. The confirmation and payment should happen on the phone, not on the car display.

## Driving Task Apps

Driving task apps have the most restrictive UI requirements. They are intended for tasks directly related to driving (e.g., road condition reporting, toll transponder management, driving logs).

```swift
func buildDrivingTaskInterface() -> CPTemplate {
    let gridButtons = [
        CPGridButton(
            titleVariants: ["Report Hazard"],
            image: UIImage(systemName: "exclamationmark.triangle")!
        ) { _ in
            // One-tap action — no further navigation
        },
        CPGridButton(
            titleVariants: ["Road Closed"],
            image: UIImage(systemName: "xmark.octagon")!
        ) { _ in
            // One-tap action
        },
        CPGridButton(
            titleVariants: ["Speed Trap"],
            image: UIImage(systemName: "gauge.with.dots.needle.67percent")!
        ) { _ in
            // One-tap action
        }
    ]

    return CPGridTemplate(title: "Report", gridButtons: gridButtons)
}
```

Design rules for driving task apps:
- Prefer single-tap actions. Avoid multi-step flows.
- Do not display content that encourages extended reading.
- `CPListTemplate` items should be actionable, not informational.
- Maximum template depth: root + 1 pushed template.

## Design Guidelines

### Driver distraction rules

Apple enforces strict distraction guidelines through both API constraints and App Review:

- **Minimal interaction**: Any task should complete in 2 taps or fewer where possible.
- **No scrolling text**: Avoid long strings. The system truncates, but design for short labels.
- **No animations or video**: Templates do not support custom animations. Map rendering in navigation apps is the exception.
- **No advertising**: CarPlay apps must not display ads.
- **Glanceable information**: Content should be understood in under 2 seconds.

### Template limitations and why they exist

The template system is intentionally restrictive. You cannot:
- Draw custom UI on the CarPlay screen (except map rendering for navigation apps).
- Create custom controls or gestures.
- Play video.
- Show web content.

These limitations exist because drivers must keep their eyes on the road. Apple rejects apps that attempt to work around these constraints.

### Dark mode

CarPlay apps must support dark mode. Templates handle this automatically through the system appearance. If you provide custom images (icons, artwork), supply both light and dark variants:

```swift
let image = UIImage(named: "station-icon")
// The system applies the appropriate variant based on car display appearance.
// Provide template-rendered images in both light and dark asset catalog variants.
```

Use SF Symbols where possible — they adapt to appearance automatically.

### Screen sizes

CarPlay displays vary in size and aspect ratio. Templates handle layout automatically. For navigation apps rendering a custom map, use the `CPTemplateApplicationScene`'s `carWindow` trait collection and screen bounds to adapt your rendering.

## Testing

### CarPlay Simulator in Xcode

Xcode includes a CarPlay Simulator (accessible from the Xcode menu: **Xcode > Open Developer Tool > CarPlay Simulator** or via the **I/O** menu in Simulator). It supports:

- All template types.
- Multiple display sizes (standard, wide).
- Dark and light appearance.
- Simulated connect/disconnect events.

Use the CarPlay Simulator as your primary development tool. It connects to the running iOS Simulator, so you can test both screens simultaneously.

### Testing on physical CarPlay units

Physical testing is essential before submission:
- Test with both wired (Lightning/USB-C) and wireless CarPlay if your app supports it.
- Verify behavior during phone calls, Siri activation, and other interruptions.
- Test connect/disconnect cycles — ensure no memory leaks or state corruption.
- Verify template updates while the car display is active (e.g., new messages arriving, playback changes).

### Common pitfalls

- **Forgetting to handle disconnect**: Always nil out your `interfaceController` reference in `didDisconnectInterfaceController`. Holding a stale reference causes crashes.
- **Blocking the main thread**: Template updates happen on the main thread. Long-running work (network, database) must be dispatched off the main thread.
- **Too many list items**: While there is no hard API limit on list items, Apple reviewers reject apps with excessively long lists. Keep lists to ~20 items or fewer per section.
- **Missing entitlement**: Without the correct CarPlay entitlement provisioned in your App ID, the scene delegate is never called. The app appears to do nothing.
- **Assuming screen dimensions**: CarPlay screens vary. Do not hardcode sizes for map rendering.

## Entitlements and App Review

### Entitlement request process

1. Sign in to the [Apple Developer account](https://developer.apple.com/account).
2. Navigate to **Certificates, Identifiers & Profiles > Identifiers**.
3. Select your App ID and enable the appropriate CarPlay capability.
4. For most CarPlay entitlements, you must submit a request form explaining your app's use case. Apple reviews requests manually.
5. Once approved, the entitlement appears in your provisioning profile.

Development builds can use the CarPlay Simulator without the production entitlement, but physical CarPlay hardware requires a properly provisioned profile.

### Entitlements by app type

Add the granted entitlement to your app's `.entitlements` file:

```xml
<key>com.apple.developer.carplay-audio</key>
<true/>
```

Multiple entitlements can coexist:

```xml
<key>com.apple.developer.carplay-maps</key>
<true/>
<key>com.apple.developer.carplay-charging</key>
<true/>
```

### App Review guidelines specific to CarPlay

- Apps must use only the templates allowed for their entitlement type.
- The CarPlay interface must provide clear, immediate value — it cannot be a stub that redirects to the phone.
- Navigation apps must provide actual routing and guidance, not just a map view.
- Audio apps must integrate with `MPNowPlayingInfoCenter` so the system Now Playing UI works correctly.
- Apps must not attempt to circumvent template constraints through overlays, alerts, or other workarounds.
- All text and images must be appropriate for in-car use (legible, high contrast, no fine detail).
