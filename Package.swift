// swift-tools-version:5.3
import PackageDescription
let package = Package(
    name: "Octopus-iOS",
    platforms: [
        .iOS(.v13)
    ],
    products: [
        .library(
            name: "Octopus",
            targets: ["Octopus"]
        )
    ],
    targets: [
        .binaryTarget(
            name: "PvOctopus",
            path: "lib/ios/PvOctopus.xcframework"
        ),
        .target(
            name: "Octopus",
            dependencies: ["PvOctopus"],
            path: ".",
            exclude: [
                "binding/ios/OctopusAppTest",
                "demo"
            ],
            sources: [
                "binding/ios/Octopus.swift",
                "binding/ios/OctopusErrors.swift",
                "binding/ios/OctopusMetadata.swift"
            ],
            resources: [
                .copy("lib/common/param/octopus_params.pv")
            ]
        )
    ]
)