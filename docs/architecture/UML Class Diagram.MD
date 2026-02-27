# UML Class Diagram

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
    
    AttendanceRecord "*" -- "1" Certificate : Generates
    
    Organization "1" -- "*" CertificateTemplate : Defines
    Certificate "*" -- "1" CertificateTemplate : Uses
    
    Volunteer "*" -- "*" Skill : Possesses
    Opportunity "*" -- "*" Skill : Requires

    Volunteer --> Location
    Opportunity --> Location
    Organization --> Location
    
    %% Classes
    class User {
        +Guid userId
        +string email
        +string passwordHash
        +string role
        +DateTime createdAt
        +DateTime? lastLoginAt
        +bool isActive
        +login()
        +logout()
        +resetPassword()
    }

    class Volunteer {
        +string name
        +string phoneNumber
        +string bio
        +double totalHours
        +Location currentLocation
        +List~Guid~ skillIds
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
        +Guid organizationId
        +string name
        +string description
        +string logoUrl
        +string website
        +Location location
        +string verificationProof
        +bool isVerified
        +string calendarSyncUrl
        +getVolunteerStats()
        +verifyCredential(credId)
    }

    class Opportunity {
        +Guid opportunityId
        +Guid organizationId
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
        +Guid appId
        +Guid volunteerId
        +Guid opportunityId
        +DateTime submissionDate
        +ApplicationStatus status
        +string rejectionReason
        +approve()
        +reject()
        +waitlist()
    }

    class Credential {
        +Guid credId
        +Guid volunteerId
        +CredentialType type
        +string fileUrl
        +DateTime expirationDate
        +bool isVerified
        +checkExpiration()
    }

    class AttendanceRecord {
        +Guid recordId
        +Guid volunteerId
        +Guid opportunityId
        +DateTime timeIn
        +DateTime? timeOut
        +double totalHours
        +AttendanceMethod checkInMethod
        +AttendanceStatus status
        +verifyLocation(userLoc, venueLoc)
    }

    class CertificateTemplate {
        +Guid templateId
        +string name
        +string districtRegion
        +CertificateTemplateType type
        +string layoutConfig
        +preview()
    }

    class Certificate {
        +Guid certId
        +Guid volunteerId
        +List~Guid~ attendanceRecordIds
        +string coordinatorSignature
        +DateTime issueDate
        +string fileUrl
        +download()
    }

    class Skill {
        +Guid skillId
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
