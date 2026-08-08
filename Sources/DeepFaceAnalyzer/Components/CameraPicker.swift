import SwiftUI
import UIKit

/// Camera capture.
///
/// SwiftUI has no native camera view, so this wraps `UIImagePickerController`.
/// `PhotosPicker` covers the library case natively and is used directly at the
/// call site — only the camera needs bridging.
public struct CameraPicker: UIViewControllerRepresentable {
    /// Receives a local file URL for the captured image, or nil if cancelled.
    public let onCapture: (URL?) -> Void

    @Environment(\.dismiss) private var dismiss

    public init(onCapture: @escaping (URL?) -> Void) {
        self.onCapture = onCapture
    }

    public func makeUIViewController(context: Context) -> UIImagePickerController {
        let controller = UIImagePickerController()
        // Falls back to the library on a device with no camera, rather than
        // presenting a black screen.
        controller.sourceType = UIImagePickerController.isSourceTypeAvailable(.camera)
            ? .camera
            : .photoLibrary
        controller.allowsEditing = true
        controller.delegate = context.coordinator
        return controller
    }

    public func updateUIViewController(_ controller: UIImagePickerController, context: Context) {}

    public func makeCoordinator() -> Coordinator {
        Coordinator(onCapture: onCapture, dismiss: { dismiss() })
    }

    public final class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        private let onCapture: (URL?) -> Void
        private let dismiss: () -> Void

        init(onCapture: @escaping (URL?) -> Void, dismiss: @escaping () -> Void) {
            self.onCapture = onCapture
            self.dismiss = dismiss
        }

        public func imagePickerController(
            _ picker: UIImagePickerController,
            didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]
        ) {
            let image = (info[.editedImage] as? UIImage) ?? (info[.originalImage] as? UIImage)
            onCapture(image.flatMap(ImageStore.persist))
            dismiss()
        }

        public func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            onCapture(nil)
            dismiss()
        }
    }
}

/// Writes picked images into the caches directory.
///
/// Caches rather than documents: these are faces, and they should not survive
/// longer than the session needs them. The system may reclaim the directory under
/// pressure, which the result card already handles.
public enum ImageStore {
    public static func persist(_ image: UIImage) -> URL? {
        guard let data = image.jpegData(compressionQuality: 0.85) else { return nil }
        let url = FileManager.default
            .urls(for: .cachesDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("\(UUID().uuidString).jpg")
        do {
            try data.write(to: url, options: .atomic)
            return url
        } catch {
            return nil
        }
    }
}
