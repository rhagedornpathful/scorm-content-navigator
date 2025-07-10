export interface SCORMData {
  [key: string]: string;
}

export interface SCORMDataStore {
  getValue(element: string): string;
  setValue(element: string, value: string): boolean;
  commit(): boolean;
  initialize(): boolean;
  terminate(): boolean;
}

export class LocalSCORMDataStore implements SCORMDataStore {
  private data: SCORMData = {};
  private initialized = false;
  private errorCode = "0";

  constructor(private userId?: string, private courseId?: string) {
    // Initialize with default CMI values
    this.data = {
      "cmi.core.student_id": userId || "student_001",
      "cmi.core.student_name": "Student",
      "cmi.core.lesson_location": "",
      "cmi.core.credit": "credit",
      "cmi.core.lesson_status": "not attempted",
      "cmi.core.entry": "ab-initio",
      "cmi.core.lesson_mode": "normal",
      "cmi.core.exit": "",
      "cmi.core.session_time": "00:00:00",
      "cmi.core.total_time": "00:00:00",
      "cmi.core.score.raw": "",
      "cmi.core.score.max": "",
      "cmi.core.score.min": "",
      "cmi.suspend_data": "",
      "cmi.launch_data": "",
      "cmi.comments": "",
      "cmi.comments_from_lms": "",
    };
  }

  initialize(): boolean {
    if (this.initialized) {
      this.errorCode = "101"; // Already initialized
      return false;
    }
    this.initialized = true;
    this.errorCode = "0";
    return true;
  }

  terminate(): boolean {
    if (!this.initialized) {
      this.errorCode = "112"; // Not initialized
      return false;
    }
    this.initialized = false;
    this.errorCode = "0";
    return true;
  }

  getValue(element: string): string {
    if (!this.initialized) {
      this.errorCode = "112"; // Not initialized
      return "";
    }

    this.errorCode = "0";
    return this.data[element] || "";
  }

  setValue(element: string, value: string): boolean {
    if (!this.initialized) {
      this.errorCode = "112"; // Not initialized
      return false;
    }

    // Validate writable elements
    const readOnlyElements = [
      "cmi.core.student_id",
      "cmi.core.student_name",
      "cmi.core.credit",
      "cmi.core.entry",
      "cmi.core.lesson_mode",
      "cmi.core.total_time",
      "cmi.launch_data",
      "cmi.comments_from_lms",
    ];

    if (readOnlyElements.includes(element)) {
      this.errorCode = "403"; // Element is read only
      return false;
    }

    // Input validation and sanitization
    if (!this.validateSCORMElement(element, value)) {
      this.errorCode = "405"; // Invalid data
      return false;
    }

    this.data[element] = this.sanitizeValue(value);
    this.errorCode = "0";
    return true;
  }

  private validateSCORMElement(element: string, value: string): boolean {
    // Length validation
    if (value.length > 4096) return false;

    // Element-specific validation
    switch (element) {
      case "cmi.core.lesson_status":
        return ["passed", "completed", "failed", "incomplete", "browsed", "not attempted"].includes(value);
      case "cmi.core.exit":
        return ["time-out", "suspend", "logout", "normal", ""].includes(value);
      case "cmi.core.score.raw":
      case "cmi.core.score.max":
      case "cmi.core.score.min":
        return /^-?\d*\.?\d*$/.test(value) && value.length <= 10;
      case "cmi.core.session_time":
      case "cmi.core.total_time":
        return /^\d{2,4}:\d{2}:\d{2}(\.\d{1,2})?$/.test(value);
      default:
        return true;
    }
  }

  private sanitizeValue(value: string): string {
    // Remove potentially dangerous characters
    return value
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/javascript:/gi, "")
      .replace(/on\w+\s*=/gi, "")
      .trim()
      .substring(0, 4096);
  }

  commit(): boolean {
    if (!this.initialized) {
      this.errorCode = "112"; // Not initialized
      return false;
    }

    // Secure logging - only in development
    if (process.env.NODE_ENV === "development") {
      console.log("SCORM data committed");
    }
    this.errorCode = "0";
    return true;
  }

  getLastError(): string {
    return this.errorCode;
  }

  getErrorString(errorCode: string): string {
    const errorMessages: { [key: string]: string } = {
      "0": "No error",
      "101": "General exception",
      "112": "LMS not initialized",
      "403": "Element is read only",
      "404": "Element not found",
      "405": "Invalid data",
    };
    return errorMessages[errorCode] || "Unknown error";
  }

  getAll(): SCORMData {
    return { ...this.data };
  }
}

export function createSCORMAPI(dataStore: SCORMDataStore) {
  // SCORM 1.2 API
  const API = {
    LMSInitialize(param: string): string {
      return dataStore.initialize() ? "true" : "false";
    },
    
    LMSFinish(param: string): string {
      dataStore.commit();
      return dataStore.terminate() ? "true" : "false";
    },
    
    LMSGetValue(element: string): string {
      return dataStore.getValue(element);
    },
    
    LMSSetValue(element: string, value: string): string {
      return dataStore.setValue(element, value) ? "true" : "false";
    },
    
    LMSCommit(param: string): string {
      return dataStore.commit() ? "true" : "false";
    },
    
    LMSGetLastError(): string {
      return (dataStore as LocalSCORMDataStore).getLastError();
    },
    
    LMSGetErrorString(errorCode: string): string {
      return (dataStore as LocalSCORMDataStore).getErrorString(errorCode);
    },
    
    LMSGetDiagnostic(errorCode: string): string {
      return "";
    }
  };

  // SCORM 2004 API (for compatibility)
  const API_1484_11 = {
    Initialize(param: string): string {
      return API.LMSInitialize(param);
    },
    
    Terminate(param: string): string {
      return API.LMSFinish(param);
    },
    
    GetValue(element: string): string {
      return API.LMSGetValue(element);
    },
    
    SetValue(element: string, value: string): string {
      return API.LMSSetValue(element, value);
    },
    
    Commit(param: string): string {
      return API.LMSCommit(param);
    },
    
    GetLastError(): string {
      return API.LMSGetLastError();
    },
    
    GetErrorString(errorCode: string): string {
      return API.LMSGetErrorString(errorCode);
    },
    
    GetDiagnostic(errorCode: string): string {
      return API.LMSGetDiagnostic(errorCode);
    }
  };

  return { API, API_1484_11 };
}