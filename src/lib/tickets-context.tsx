import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { api } from "./axios";

export interface Ticket {
  id: string;
  name: string;
  description: string;
  status: "active" | "inProgress" | "done" | "closed";
  updatedAt: string;
}

const INITIAL_TICKET: Ticket[] = [];

interface TicketsContextType {
  tickets: Ticket[];
  getTicket: (id: string) => Ticket | undefined;
  createTicket: (
    data: Omit<Ticket, "id" | "updatedAt">,
  ) => Promise<Ticket | undefined>;
  updateTicket: (id: string, data: Partial<Ticket>) => Promise<void>;
  closeTicket: (id: string) => Promise<void>;
}

const TicketsContext = createContext<TicketsContextType | null>(null);

export function TicketsProvider({ children }: { children: React.ReactNode }) {
  const [tickets, setTickets] = useState<Ticket[]>(INITIAL_TICKET);

  const getTickets = useCallback(async () => {
    try {
      // const response = await api.get('projects/');
      // setTickets(response.data);
    } catch (error: any) {
      console.error("Failed to fetch projects", error);
    }
  }, []);

  useEffect(() => {
    getTickets();
  }, [getTickets]);

  const getTicket = useCallback(
    (id: string) => tickets.find((p) => p.id === id),
    [tickets],
  );

  const createTicket = useCallback(
    async (data: Omit<Ticket, "id" | "updatedAt">) => {
      try {
        // const response = await api.post('projects/', data);

        const ticket = response.data;

        setTickets((prev) => [ticket, ...prev]);

        return ticket;
      } catch (error) {
        throw error;
      }
    },
    [],
  );

  const updateTicket = useCallback(
    async (id: string, data: Partial<Ticket>) => {
      try {
        // const response = await api.patch(`projects/${id}/`, data);
        const ticket = response.data;
        setTickets((prev) => prev.map((p) => (p.id === id ? ticket : p)));
      } catch (error) {
        throw error;
      }
    },
    [],
  );

  const closeTicket = useCallback(async (id: string) => {
    // try {
    //   await api.delete(`projects/${id}/`);
    //   setTickets(prev => prev.filter(p => p !== null && p.id !== id));
    // } catch (error) {
    //   console.error("Failed to delete project:", error);
    //   throw error;
    // }
  }, []);

  return (
    <TicketsContext.Provider
      value={{ tickets, getTicket, createTicket, updateTicket, closeTicket }}
    >
      {children}
    </TicketsContext.Provider>
  );
}

export function useTickets() {
  const ctx = useContext(TicketsContext);
  if (!ctx) throw new Error("useTickets must be inside TicketsProvider");
  return ctx;
}
