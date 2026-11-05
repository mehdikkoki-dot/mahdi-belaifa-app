import AVFoundation
import SwiftUI
import UIKit

/// In-app QR scanner: point the camera at the receipt code and the ticket opens.
struct QRScannerView: UIViewControllerRepresentable {
    var onCode: (String) -> Void

    func makeUIViewController(context: Context) -> ScannerViewController {
        let vc = ScannerViewController()
        vc.onCode = onCode
        return vc
    }

    func updateUIViewController(_ vc: ScannerViewController, context: Context) {}
}

final class ScannerViewController: UIViewController, AVCaptureMetadataOutputObjectsDelegate {
    var onCode: ((String) -> Void)?
    private let session = AVCaptureSession()
    private var preview: AVCaptureVideoPreviewLayer?
    private var fired = false
    private let deniedLabel = UILabel()

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black
        deniedLabel.text = "الكاميرا غير مسموحة — فعّلها من إعدادات الهاتف"
        deniedLabel.textColor = .white
        deniedLabel.font = .systemFont(ofSize: 16, weight: .semibold)
        deniedLabel.textAlignment = .center
        deniedLabel.numberOfLines = 0
        deniedLabel.isHidden = true
        deniedLabel.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(deniedLabel)
        NSLayoutConstraint.activate([
            deniedLabel.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            deniedLabel.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            deniedLabel.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 32),
            deniedLabel.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -32)
        ])
        AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
            DispatchQueue.main.async {
                if granted { self?.setup() } else { self?.deniedLabel.isHidden = false }
            }
        }
    }

    private func setup() {
        guard let device = AVCaptureDevice.default(for: .video),
              let input = try? AVCaptureDeviceInput(device: device),
              session.canAddInput(input) else { deniedLabel.isHidden = false; return }
        session.addInput(input)
        let output = AVCaptureMetadataOutput()
        guard session.canAddOutput(output) else { return }
        session.addOutput(output)
        output.setMetadataObjectsDelegate(self, queue: .main)
        output.metadataObjectTypes = [.qr]
        let layer = AVCaptureVideoPreviewLayer(session: session)
        layer.videoGravity = .resizeAspectFill
        layer.frame = view.bounds
        view.layer.addSublayer(layer)
        preview = layer
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            self?.session.startRunning()
        }
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        preview?.frame = view.bounds
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        if session.isRunning { session.stopRunning() }
    }

    func metadataOutput(_ output: AVCaptureMetadataOutput,
                        didOutput metadataObjects: [AVMetadataObject],
                        from connection: AVCaptureConnection) {
        guard !fired,
              let obj = metadataObjects.first as? AVMetadataMachineReadableCodeObject,
              let value = obj.stringValue else { return }
        fired = true
        UINotificationFeedbackGenerator().notificationOccurred(.success)
        onCode?(value)
    }
}

/// Full-screen scanner sheet with a framing guide.
struct ScannerSheet: View {
    var onCode: (String) -> Void
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            QRScannerView { code in
                dismiss()
                onCode(code)
            }
            .ignoresSafeArea()
            RoundedRectangle(cornerRadius: 28)
                .stroke(Color.white.opacity(0.9), lineWidth: 3)
                .frame(width: 250, height: 250)
            VStack {
                Spacer()
                Text("وجّه الكاميرا نحو كود الطلب")
                    .font(.cairo(16, .bold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 18).padding(.vertical, 10)
                    .background(Color.black.opacity(0.55))
                    .clipShape(Capsule())
                    .padding(.bottom, 60)
            }
        }
    }
}
