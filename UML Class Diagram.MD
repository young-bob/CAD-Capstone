``` mermaid
classDiagram
    %% Relationships
    User <|-- Volunteer
    User <|-- Coordinator
    
    Coordinator "*" -- "1" Organization : Manages
    Organization "1" -- "*" Opportunity : Publishes
    
    Volunteer "1" -- "*" Credential : Uploads
    Organization "1" -- "*" Credential : Verifies
    
    Volunteer "*" -- "*" Organization : Joins
    
    Volunteer "1" -- "*" Application : Submits
    Opportunity "1" -- "*" Application : Receives
    
    Volunteer "1" -- "*" AttendanceRecord : Generates
    Opportunity "1" -- "*" AttendanceRecord : Tracks
    
    AttendanceRecord "1" -- "1" Certificate : Generates
    
    Organization "1" -- "*" CertificateTemplate : Defines
    Certificate "*" -- "1" CertificateTemplate : Uses
    
    Volunteer "*" -- "*" Skill : Possesses
    Opportunity "*" -- "*" Skill : Requires

    Volunteer --> Location
    Opportunity --> Location
    
    %% Classes
    class User {
        +int userId
        +string email
        +string passwordHash
        +string phoneNumber
        +login()
        +logout()
        +resetPassword()
    }

    class Volunteer {
        +string bio
        +float totalHours
        +Location currentLocation
        +searchOpportunities(filters)
        +uploadCredential(doc)
        +checkIn(gpsLocation)
        +checkOut()
        +viewPortfolio()
    }

    class Coordinator {
        +string jobTitle
        +verifyOrgStatus()
        +createShift(opportunity)
        +validateAttendance(volunteerId)
        +viewDemandForecast()
    }

    class Organization {
        +int orgId
        +string name
        +string verificationProof
        +boolean isVerified
        +string calendarSyncUrl
        +string description
        +string logoUrl
        +string website
        +getVolunteerStats()
        +verifyCredential(credId)
    }

    class Opportunity {
        +int oppId
        +string title
        +string description
        +OpportunityVisibility visibility
        +DateTime startTime
        +DateTime endTime
        +Location venueLocation
        +float geoFenceRadius
        +int maxVolunteers
        +int registeredCount
        +generateQRCode()
    }

    class Application {
        +int appId
        +DateTime submissionDate
        +ApplicationStatus status
        +string rejectionReason
        +approve()
        +reject()
        +waitlist()
    }

    class Credential {
        +int credId
        +CredentialType type
        +string fileUrl
        +DateTime expirationDate
        +boolean isVerified
        +checkExpiration()
    }

    class AttendanceRecord {
        +int recordId
        +DateTime timeIn
        +DateTime timeOut
        +float totalHours
        +AttendanceMethod checkInMethod
        +AttendanceStatus status
        +verifyLocation(userLoc, venueLoc)
    }

    class CertificateTemplate {
        +int templateId
        +string name
        +string districtRegion
        +CertificateTemplateType type
        +string layoutConfig
        +preview()
    }

    class Certificate {
        +int certId
        +string coordinatorSignature
        +DateTime issueDate
        +string fileUrl
        +download()
    }

    class Skill {
        +int skillId
        +string name
        +string description
    }

    class Location {
        +double latitude
        +double longitude
        +string address
        +string city
        +string province
        +string postalCode
    }

    %% Enums
    class ApplicationStatus {
        <<enumeration>>
        PENDING
        APPROVED
        REJECTED
        WAITLISTED
    }

    class AttendanceMethod {
        <<enumeration>>
        GPS
        QR_CODE
    }

    class AttendanceStatus {
        <<enumeration>>
        PENDING
        CONFIRMED
        REJECTED
    }

    class CredentialType {
        <<enumeration>>
        BACKGROUND_CHECK
        CPR_CERTIFICATION
        VACCINE_RECORD
        OTHER
    }

    class OpportunityVisibility {
        <<enumeration>>
        PUBLIC
        INTERNAL
    }

    class CertificateTemplateType {
        <<enumeration>>
        STUDENT_HOUR_LOG
        STANDARD_CERTIFICATE
        DISTRICT_FORM
    }

```
