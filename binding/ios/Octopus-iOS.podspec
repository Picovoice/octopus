Pod::Spec.new do |s|
    s.name = 'Octopus-iOS'
    s.module_name = 'Octopus'
    s.version = '1.0.0'
    s.license = {:type => 'Apache 2.0'}
    s.summary = 'iOS binding for Picovoice\'s Octopus Speech-to-Index engine'
    s.description = 
    <<-DESC
    Octopus is Picovoice's Speech-to-Index engine. It directly indexes speech without relying on a text representation. This
    acoustic-only approach boosts accuracy by removing out-of-vocabulary limitation and eliminating the problem of competing
    hypothesis (e.g. homophones)
    DESC
    s.homepage = 'https://github.com/Picovoice/octopus/tree/master/binding/ios'
    s.author = { 'Picovoice' => 'hello@picovoice.ai' }
    s.source = { :git => "https://github.com/Picovoice/octopus.git", :tag => "Octopus-iOS-v1.0.0" }
    s.ios.deployment_target = '9.0'
    s.swift_version = '5.0'
    s.vendored_frameworks = 'lib/ios/PvOctopus.xcframework'
    s.resources = 'lib/common/octopus_params.pv'
    s.source_files = 'binding/ios/*.{swift}'
  end
