export interface SCORMItem {
  identifier: string;
  title: string;
  href?: string;
  isVisible: boolean;
  prerequisites?: string;
  maxtimeallowed?: string;
  timelimitaction?: string;
  datafromlms?: string;
  masteryScore?: number;
  children: SCORMItem[];
  parameters?: string;
}

export interface SCORMOrganization {
  identifier: string;
  title: string;
  items: SCORMItem[];
}

export interface SCORMResource {
  identifier: string;
  type: string;
  href: string;
  files: string[];
}

export interface SCORMManifest {
  identifier: string;
  version: string;
  title?: string;
  organizations: SCORMOrganization[];
  resources: SCORMResource[];
  defaultOrganization: string;
}

export class SCORMManifestParser {
  static async parseFromXML(xmlText: string): Promise<SCORMManifest> {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    
    // Check for parsing errors
    const parserError = xmlDoc.querySelector("parsererror");
    if (parserError) {
      throw new Error("Invalid XML: " + parserError.textContent);
    }

    const manifest = xmlDoc.querySelector("manifest");
    if (!manifest) {
      throw new Error("No manifest element found");
    }

    const identifier = manifest.getAttribute("identifier") || "";
    const version = manifest.getAttribute("version") || "1.0";
    
    // Get metadata title if available
    const titleElement = xmlDoc.querySelector("manifest > metadata title");
    const title = titleElement?.textContent || "SCORM Course";

    // Parse organizations
    const organizationsElement = xmlDoc.querySelector("organizations");
    const defaultOrganization = organizationsElement?.getAttribute("default") || "";
    
    const organizationElements = xmlDoc.querySelectorAll("organization");
    const organizations: SCORMOrganization[] = [];

    organizationElements.forEach(orgElement => {
      const orgId = orgElement.getAttribute("identifier") || "";
      const orgTitleElement = orgElement.querySelector("title");
      const orgTitle = orgTitleElement?.textContent || "Organization";
      
      const items = this.parseItems(orgElement.querySelectorAll(":scope > item"));
      
      organizations.push({
        identifier: orgId,
        title: orgTitle,
        items
      });
    });

    // Parse resources
    const resourceElements = xmlDoc.querySelectorAll("resource");
    const resources: SCORMResource[] = [];

    resourceElements.forEach(resourceElement => {
      const resourceId = resourceElement.getAttribute("identifier") || "";
      const type = resourceElement.getAttribute("type") || "";
      const href = resourceElement.getAttribute("href") || "";
      
      const fileElements = resourceElement.querySelectorAll("file");
      const files: string[] = [];
      fileElements.forEach(fileElement => {
        const fileHref = fileElement.getAttribute("href");
        if (fileHref) files.push(fileHref);
      });

      resources.push({
        identifier: resourceId,
        type,
        href,
        files
      });
    });

    return {
      identifier,
      version,
      title,
      organizations,
      resources,
      defaultOrganization
    };
  }

  private static parseItems(itemElements: NodeListOf<Element>): SCORMItem[] {
    const items: SCORMItem[] = [];

    itemElements.forEach(itemElement => {
      const identifier = itemElement.getAttribute("identifier") || "";
      const identifierref = itemElement.getAttribute("identifierref");
      const isVisible = itemElement.getAttribute("isvisible") !== "false";
      const prerequisites = itemElement.getAttribute("prerequisites") || undefined;
      const maxtimeallowed = itemElement.getAttribute("maxtimeallowed") || undefined;
      const timelimitaction = itemElement.getAttribute("timelimitaction") || undefined;
      const datafromlms = itemElement.getAttribute("datafromlms") || undefined;
      const parameters = itemElement.getAttribute("parameters") || undefined;
      
      const titleElement = itemElement.querySelector(":scope > title");
      const title = titleElement?.textContent || "Item";

      // Parse mastery score if available
      const masteryScoreElement = itemElement.querySelector("masteryscore");
      const masteryScore = masteryScoreElement ? 
        parseFloat(masteryScoreElement.textContent || "0") : undefined;

      // Parse child items recursively
      const childItemElements = itemElement.querySelectorAll(":scope > item");
      const children = this.parseItems(childItemElements);

      items.push({
        identifier,
        title,
        href: identifierref, // This will be resolved to actual href later
        isVisible,
        prerequisites,
        maxtimeallowed,
        timelimitaction,
        datafromlms,
        masteryScore,
        children,
        parameters
      });
    });

    return items;
  }

  static resolveItemResources(manifest: SCORMManifest): SCORMManifest {
    // Create a map of resource identifiers to resources
    const resourceMap = new Map<string, SCORMResource>();
    manifest.resources.forEach(resource => {
      resourceMap.set(resource.identifier, resource);
    });

    // Recursively resolve item hrefs
    const resolveItems = (items: SCORMItem[]): SCORMItem[] => {
      return items.map(item => {
        let resolvedHref = item.href;
        
        if (item.href && resourceMap.has(item.href)) {
          const resource = resourceMap.get(item.href)!;
          resolvedHref = resource.href;
        }

        return {
          ...item,
          href: resolvedHref,
          children: resolveItems(item.children)
        };
      });
    };

    return {
      ...manifest,
      organizations: manifest.organizations.map(org => ({
        ...org,
        items: resolveItems(org.items)
      }))
    };
  }

  static getPlayableItems(manifest: SCORMManifest): SCORMItem[] {
    const playableItems: SCORMItem[] = [];

    const extractPlayableItems = (items: SCORMItem[]) => {
      items.forEach(item => {
        if (item.href && item.isVisible) {
          playableItems.push(item);
        }
        if (item.children.length > 0) {
          extractPlayableItems(item.children);
        }
      });
    };

    manifest.organizations.forEach(org => {
      extractPlayableItems(org.items);
    });

    return playableItems;
  }
}