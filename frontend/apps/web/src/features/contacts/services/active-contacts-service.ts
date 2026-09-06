import { useMockServices } from "@/shared/config/service-mode"
import { httpContactsService } from "./http-contacts-service"
import { mockContactsService } from "./mock-contacts-service"
import type { ContactsService } from "./contacts-service"

export const contactsService: ContactsService = useMockServices
  ? mockContactsService
  : httpContactsService
