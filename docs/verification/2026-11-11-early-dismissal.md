# Early dismissal investigation

The earlier media-clock fix did not resolve the user's normal Applications launch. An instrumented normal launch recorded native `hideAll` at movie time 14.55 / timeline 14.52, followed by repeated hide/tab transitions; neither the finished bridge nor watchdog triggered this dismissal.

Investigation found the screen-parameter handler unconditionally hid and recreated the panel. A regression posting `didChangeScreenParametersNotification` without changing any display failed before the fix. The controller now compares display IDs, full/visible frames and backing scales before interrupting a presentation. Actual layout changes retain the prior dismissal behavior.

Verification: 19 native tests pass. The installed normal launch completed through `bridge: finished` at timeline16. Native full playback with an injected unchanged-display notification passed, sampled16010ms, including replay/Skip, disposal and controls. The original live trace did not label the notification itself, so its exact external source remains unconfirmed. Diagnostic tracing is opt-in through APERTURE_TRACE_PATH; ordinary launches do not log.

Installed app matched the release bundle and signature checks passed. Physical monitor changes and other Macs were not tested in this pass.
