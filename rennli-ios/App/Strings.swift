import Foundation

/// Tiny AR/FR string table. Arabic (darija) is the product's first language.
struct Strings {
    let lang: String   // "ar" | "fr"
    var isRTL: Bool { lang == "ar" }

    private func t(_ ar: String, _ fr: String) -> String { lang == "ar" ? ar : fr }

    var appName: String { "C'est Fait!" }
    var tabTicket: String { t("تذكرتي", "Mon ticket") }
    var tabOrders: String { t("طلباتي", "Mes commandes") }
    var tabSettings: String { t("الإعدادات", "Réglages") }

    var connectHint: String { t("الصق رابط تذكرتك، ولا امسح الـQR من الوصل",
                                "Collez le lien de votre ticket ou scannez le QR du reçu") }
    var linkPlaceholder: String { t("رابط التذكرة", "Lien du ticket") }
    var connect: String { t("اتصال بالتذكرة", "Suivre le ticket") }
    var badLink: String { t("الرابط أو الرقم غير صحيح", "Lien ou numéro invalide") }
    var serverError: String { t("تعذر الاتصال بالخادم", "Serveur injoignable") }
    var activitiesOff: String { t("الأنشطة الحية غير مفعلة على هذا الهاتف",
                                  "Les activités en direct sont désactivées sur ce téléphone") }
    var activityFail: String { t("تعذر بدء النشاط الحي", "Impossible de démarrer l'activité en direct") }

    var orderNumber: String { t("رقم طلبك", "Votre numéro") }
    var shopFallback: String { "C'est Fait!" }

    func statusText(_ status: String) -> String {
        switch status {
        case "waiting": return t("قيد التحضير", "En préparation")
        case "ready": return t("جاهز — تفضل للكاشير", "Prêt — au comptoir")
        case "completed": return t("تم الاستلام — بالعافية", "Récupéré — bon appétit")
        default: return status
        }
    }
    func statusShort(_ status: String) -> String {
        switch status {
        case "waiting": return t("يتحضّر", "En cours")
        case "ready": return t("جاهز", "Prêt")
        case "completed": return t("استُلم", "Récupéré")
        default: return status
        }
    }
    var waitingLine: String { t("طلبك يتحضّر", "Votre commande se prépare") }
    var waitingSub: String { t("اقعد مرتاح — جوالك يرن أول ما يجهز طلبك",
                               "Installez-vous — votre téléphone sonnera dès que c'est prêt") }
    var stepReceived: String { t("استلمنا طلبك", "Commande reçue") }
    var stepCooking: String { t("يتحضّر دروك", "En préparation") }
    var stepReady: String { t("جاهز للاستلام", "Prêt à récupérer") }

    var readyTitle: String { t("طلبك جاهز", "C'est prêt") }
    var readySub: String { t("تفضّل للكاشير واستلم طلبك", "Récupérez votre commande au comptoir") }
    var ackButton: String { t("وصلت — استلمت طلبي", "Je suis là — récupéré") }
    var ackSeen: String { t("شفت التنبيه — راني جاي", "J'arrive") }
    var ackDone: String { t("تمام — الكاشير شاف بلي راك جاي", "Le comptoir sait que vous arrivez") }
    var refresh: String { t("تحديث", "Actualiser") }

    var ordersTitle: String { t("طلباتي النشطة", "Mes commandes actives") }
    var ordersEmpty: String { t("ما عندك حتى طلب نشط", "Aucune commande active") }
    var minutesAgo: String { t("دقيقة", "min") }

    var rateTitle: String { t("بالعافية", "Bon appétit") }
    var rateAsk: String { t("استمتعت بالخدمة؟ قيّمنا على Google", "Content du service ? Notez-nous sur Google") }
    var rateThanks: String { t("شكراً على تقييمك", "Merci pour votre avis") }

    var settingsTitle: String { t("الإعدادات", "Réglages") }
    var tone: String { t("النغمة", "Sonnerie") }
    var tone1: String { t("نغمة 1 — كلاسيكية", "Sonnerie 1 — classique") }
    var tone2: String { t("نغمة 2 — خفيفة", "Sonnerie 2 — douce") }
    var language: String { t("اللغة", "Langue") }
    var device: String { t("معرّف الجهاز", "Identifiant de l'appareil") }
    var version: String { t("النسخة", "Version") }

    var live: String { t("مباشر", "En direct") }
    var alertOn: String { t("التنبيه شغال — يرن جوالك حتى لو قفلت الشاشة",
                            "Alerte active — votre téléphone sonne même écran verrouillé") }
    var tagline1: String { t("بلا تطبيق، بلا حساب، بلا رقم هاتف", "Sans application, sans compte, sans numéro") }
    var tagline2: String { t("امسح الكود وخلاص", "Scannez le code, c'est tout") }
    var ringNow: String { t("جوالك يرن دروك", "Votre téléphone sonne") }
    var ringNowSub: String { t("رنة قوية كيف البيجر — حتى تضغط «جاي»",
                               "Une sonnerie forte, comme un bipeur — jusqu'à votre arrivée") }
    var alertSub: String { t("تقدر تقفل جوالك — الطلب يبان على شاشة القفل",
                             "Vous pouvez verrouiller — le ticket reste sur l'écran de verrouillage") }
    var followUs: String { t("تابعنا", "Suivez-nous") }
    var scanTitle: String { t("امسح الكود", "Scanner le code") }
    var scanSub: String { t("وجّه الكاميرا على كود C'est Fait!", "Pointez la caméra sur un code C'est Fait!") }
    var currentOrders: String { t("الحالية", "En cours") }
    var thanksTitle: String { t("شكراً لك!", "Merci !") }
    func rateLine(_ shop: String) -> String {
        t("قيّم \(shop) على قوقل ماب، تفرق معنا كثير", "Notez \(shop) sur Google Maps, ça compte beaucoup")
    }
    var rateButton: String { t("قيّمنا على قوقل", "Notez-nous sur Google") }
    var poweredBy: String { t("يعمل بواسطة", "Propulsé par") }
    var newTicket: String { t("تذكرة جديدة", "Nouveau ticket") }
    var scanButton: String { t("امسح كود الطلب", "Scanner le code") }
    var galleryButton: String { t("اقرأ QR من المعرض", "Lire un QR depuis la galerie") }
    var qrNotFound: String { t("ما لقيتش كود QR في هذي الصورة", "Aucun code QR trouvé dans cette image") }
    var aheadOfYou: (Int) -> String { { n in self.t("قدامك \(n) طلب", "\(n) commande(s) devant vous") } }
    var youNext: String { t("أنت التالي — طلبك يتحضّر الآن", "Vous êtes le prochain") }
    var nearTitle: String { t("طلبك قريب", "Votre commande est proche") }
    var nearSub: String { t("ابقى قريب من الكاشير — دورك وصل تقريباً", "Restez près du comptoir") }
    var offerTitle: String { t("عرض اليوم", "Offre du jour") }
    var voiceAnnounceSetting: String { t("إعلان صوتي عند الجاهزية", "Annonce vocale quand c'est prêt") }
    var adTag: String { t("إعلان", "Pub") }
    var clearAll: String { t("مسح الكل", "Tout effacer") }
    var clearConfirm: String { t("تمسح كل الطلبات من القائمة؟", "Effacer toutes les commandes de la liste ?") }
    var deleteWord: String { t("مسح", "Effacer") }
    var orPaste: String { t("ولا الصق الرابط", "ou collez le lien") }
    func etaText(_ m: Int) -> String { t("خلال \(m) دقيقة تقريباً", "dans environ \(m) min") }
    var menu: String { t("المنيو", "Menu") }
    var instagram: String { t("انستغرام", "Instagram") }
    var tiktok: String { t("تيك توك", "TikTok") }
    var map: String { t("الخريطة", "Plan") }

    static func current() -> Strings {
        Strings(lang: UserDefaults.standard.string(forKey: "lang") ?? "ar")
    }
}
