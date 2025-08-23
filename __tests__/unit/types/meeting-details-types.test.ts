import {
  // Branded types
  MeetingId,
  ParticipantId,
  AgendaItemId,
  VenueId,
  DocumentId,
  ResolutionId,
  ActionItemId,
  MinutesId,
  MeetingNoteId,
  VotingSessionId,
  
  // Type constructors
  createMeetingId,
  createParticipantId,
  createAgendaItemId,
  createVenueId,
  createDocumentId,
  createResolutionId,
  createActionItemId,
  createMinutesId,
  createMeetingNoteId,
  createVotingSessionId,
  
  // Type guards
  isMeetingId,
  isParticipantId,
  isAgendaItemId,
  
  // Utility functions
  formatMeetingId,
  parseMeetingId,
  generateMeetingId,
  
  // Validation functions
  validateMeetingIdFormat,
  validateParticipantIdFormat
} from '@/types/meeting-details'

describe('Meeting Details Branded Types', () => {
  describe('Type Constructors', () => {
    describe('createMeetingId', () => {
      it('creates valid MeetingId from valid UUID string', () => {
        const validUuid = '123e4567-e89b-12d3-a456-426614174000'
        const result = createMeetingId(validUuid)
        
        expect(result.success).toBe(true)
        if (result.success) {
          expect(typeof result.data).toBe('string')
          expect(result.data).toBe(validUuid)
        }
      })

      it('creates valid MeetingId from numeric string', () => {
        const numericId = '12345'
        const result = createMeetingId(numericId)
        
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toBe(numericId)
        }
      })

      it('rejects empty string', () => {
        const result = createMeetingId('')
        
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.code).toBe('INVALID_MEETING_ID')
          expect(result.error.message).toContain('empty')
        }
      })

      it('rejects string with only whitespace', () => {
        const result = createMeetingId('   ')
        
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.code).toBe('INVALID_MEETING_ID')
        }
      })

      it('rejects string longer than maximum length', () => {
        const longString = 'a'.repeat(257) // Assume max length is 256
        const result = createMeetingId(longString)
        
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.code).toBe('INVALID_MEETING_ID')
          expect(result.error.message).toContain('length')
        }
      })

      it('rejects string with invalid characters', () => {
        const invalidId = 'meeting-id-with-<script>alert("xss")</script>'
        const result = createMeetingId(invalidId)
        
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.code).toBe('INVALID_MEETING_ID')
        }
      })
    })

    describe('createParticipantId', () => {
      it('creates valid ParticipantId from valid string', () => {
        const validId = 'participant-123'
        const result = createParticipantId(validId)
        
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toBe(validId)
        }
      })

      it('rejects invalid participant ID format', () => {
        const invalidId = ''
        const result = createParticipantId(invalidId)
        
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.code).toBe('INVALID_PARTICIPANT_ID')
        }
      })
    })

    describe('createAgendaItemId', () => {
      it('creates valid AgendaItemId', () => {
        const validId = 'agenda-item-456'
        const result = createAgendaItemId(validId)
        
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toBe(validId)
        }
      })
    })

    describe('createVenueId', () => {
      it('creates valid VenueId', () => {
        const validId = 'venue-789'
        const result = createVenueId(validId)
        
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toBe(validId)
        }
      })
    })

    describe('createDocumentId', () => {
      it('creates valid DocumentId', () => {
        const validId = 'doc-abc123'
        const result = createDocumentId(validId)
        
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toBe(validId)
        }
      })
    })

    describe('createResolutionId', () => {
      it('creates valid ResolutionId', () => {
        const validId = 'resolution-xyz789'
        const result = createResolutionId(validId)
        
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toBe(validId)
        }
      })
    })

    describe('createActionItemId', () => {
      it('creates valid ActionItemId', () => {
        const validId = 'action-def456'
        const result = createActionItemId(validId)
        
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toBe(validId)
        }
      })
    })

    describe('createMinutesId', () => {
      it('creates valid MinutesId', () => {
        const validId = 'minutes-ghi789'
        const result = createMinutesId(validId)
        
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toBe(validId)
        }
      })
    })

    describe('createMeetingNoteId', () => {
      it('creates valid MeetingNoteId', () => {
        const validId = 'note-jkl012'
        const result = createMeetingNoteId(validId)
        
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toBe(validId)
        }
      })
    })

    describe('createVotingSessionId', () => {
      it('creates valid VotingSessionId', () => {
        const validId = 'vote-mno345'
        const result = createVotingSessionId(validId)
        
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toBe(validId)
        }
      })
    })
  })

  describe('Type Guards', () => {
    describe('isMeetingId', () => {
      it('returns true for valid MeetingId', () => {
        const result = createMeetingId('valid-meeting-id')
        if (result.success) {
          expect(isMeetingId(result.data)).toBe(true)
        }
      })

      it('returns false for plain string', () => {
        const plainString = 'not-a-meeting-id' as any
        expect(isMeetingId(plainString)).toBe(false)
      })

      it('returns false for null', () => {
        expect(isMeetingId(null as any)).toBe(false)
      })

      it('returns false for undefined', () => {
        expect(isMeetingId(undefined as any)).toBe(false)
      })

      it('returns false for number', () => {
        expect(isMeetingId(123 as any)).toBe(false)
      })
    })

    describe('isParticipantId', () => {
      it('returns true for valid ParticipantId', () => {
        const result = createParticipantId('valid-participant-id')
        if (result.success) {
          expect(isParticipantId(result.data)).toBe(true)
        }
      })

      it('returns false for invalid input', () => {
        expect(isParticipantId('plain-string' as any)).toBe(false)
      })
    })

    describe('isAgendaItemId', () => {
      it('returns true for valid AgendaItemId', () => {
        const result = createAgendaItemId('valid-agenda-id')
        if (result.success) {
          expect(isAgendaItemId(result.data)).toBe(true)
        }
      })

      it('returns false for invalid input', () => {
        expect(isAgendaItemId('plain-string' as any)).toBe(false)
      })
    })
  })

  describe('Utility Functions', () => {
    describe('formatMeetingId', () => {
      it('formats MeetingId with prefix', () => {
        const result = createMeetingId('12345')
        if (result.success) {
          const formatted = formatMeetingId(result.data)
          expect(formatted).toBe('MTG-12345')
        }
      })

      it('handles already formatted IDs', () => {
        const result = createMeetingId('MTG-67890')
        if (result.success) {
          const formatted = formatMeetingId(result.data)
          expect(formatted).toBe('MTG-67890') // Should not double-format
        }
      })
    })

    describe('parseMeetingId', () => {
      it('parses formatted meeting ID', () => {
        const parsed = parseMeetingId('MTG-12345')
        expect(parsed.success).toBe(true)
        if (parsed.success) {
          expect(parsed.data).toBe('12345')
        }
      })

      it('handles unformatted meeting ID', () => {
        const parsed = parseMeetingId('12345')
        expect(parsed.success).toBe(true)
        if (parsed.success) {
          expect(parsed.data).toBe('12345')
        }
      })

      it('rejects invalid format', () => {
        const parsed = parseMeetingId('INVALID-FORMAT-123')
        expect(parsed.success).toBe(false)
      })
    })

    describe('generateMeetingId', () => {
      it('generates valid MeetingId', () => {
        const generated = generateMeetingId()
        expect(generated.success).toBe(true)
        if (generated.success) {
          expect(typeof generated.data).toBe('string')
          expect(generated.data.length).toBeGreaterThan(0)
        }
      })

      it('generates unique IDs on multiple calls', () => {
        const id1 = generateMeetingId()
        const id2 = generateMeetingId()
        
        expect(id1.success && id2.success).toBe(true)
        if (id1.success && id2.success) {
          expect(id1.data).not.toBe(id2.data)
        }
      })

      it('generates IDs that pass validation', () => {
        const generated = generateMeetingId()
        if (generated.success) {
          const validation = validateMeetingIdFormat(generated.data as string)
          expect(validation.valid).toBe(true)
        }
      })
    })
  })

  describe('Validation Functions', () => {
    describe('validateMeetingIdFormat', () => {
      it('validates correct UUID format', () => {
        const validation = validateMeetingIdFormat('123e4567-e89b-12d3-a456-426614174000')
        expect(validation.valid).toBe(true)
        expect(validation.errors).toHaveLength(0)
      })

      it('validates correct numeric format', () => {
        const validation = validateMeetingIdFormat('12345')
        expect(validation.valid).toBe(true)
        expect(validation.errors).toHaveLength(0)
      })

      it('validates correct alphanumeric format', () => {
        const validation = validateMeetingIdFormat('meeting-abc123')
        expect(validation.valid).toBe(true)
        expect(validation.errors).toHaveLength(0)
      })

      it('rejects empty string', () => {
        const validation = validateMeetingIdFormat('')
        expect(validation.valid).toBe(false)
        expect(validation.errors).toContain('Meeting ID cannot be empty')
      })

      it('rejects string with only whitespace', () => {
        const validation = validateMeetingIdFormat('   ')
        expect(validation.valid).toBe(false)
        expect(validation.errors).toContain('Meeting ID cannot be empty or only whitespace')
      })

      it('rejects string that is too long', () => {
        const longString = 'a'.repeat(257)
        const validation = validateMeetingIdFormat(longString)
        expect(validation.valid).toBe(false)
        expect(validation.errors.some(error => error.includes('length'))).toBe(true)
      })

      it('rejects string with invalid characters', () => {
        const validation = validateMeetingIdFormat('meeting<script>alert("xss")</script>')
        expect(validation.valid).toBe(false)
        expect(validation.errors.some(error => error.includes('characters'))).toBe(true)
      })

      it('provides detailed error messages', () => {
        const validation = validateMeetingIdFormat('')
        expect(validation.errors.length).toBeGreaterThan(0)
        expect(validation.errors[0]).toMatch(/Meeting ID/)
      })
    })

    describe('validateParticipantIdFormat', () => {
      it('validates correct participant ID format', () => {
        const validation = validateParticipantIdFormat('participant-123')
        expect(validation.valid).toBe(true)
        expect(validation.errors).toHaveLength(0)
      })

      it('rejects invalid participant ID format', () => {
        const validation = validateParticipantIdFormat('')
        expect(validation.valid).toBe(false)
        expect(validation.errors.length).toBeGreaterThan(0)
      })

      it('provides specific error messages for participant IDs', () => {
        const validation = validateParticipantIdFormat('invalid')
        if (!validation.valid) {
          expect(validation.errors[0]).toMatch(/Participant ID/)
        }
      })
    })
  })

  describe('Compile-Time Type Safety', () => {
    it('prevents mixing different branded types', () => {
      // These tests verify TypeScript compile-time behavior
      // They would fail at compile time, not runtime
      
      const meetingResult = createMeetingId('meeting-123')
      const participantResult = createParticipantId('participant-456')
      
      if (meetingResult.success && participantResult.success) {
        const meetingId = meetingResult.data
        const participantId = participantResult.data
        
        // This would be a TypeScript error if uncommented:
        // function processMeeting(id: MeetingId) {}
        // processMeeting(participantId) // ❌ TypeScript error
        
        // But this is fine:
        // processMeeting(meetingId) // ✅ Correct type
        
        expect(typeof meetingId).toBe('string')
        expect(typeof participantId).toBe('string')
      }
    })

    it('maintains string operations while providing type safety', () => {
      const result = createMeetingId('test-123')
      if (result.success) {
        const meetingId = result.data
        
        // String operations should still work
        expect(meetingId.length).toBeGreaterThan(0)
        expect(meetingId.toUpperCase()).toBe('TEST-123')
        expect(meetingId.includes('test')).toBe(true)
      }
    })
  })

  describe('Error Handling', () => {
    it('provides structured error objects', () => {
      const result = createMeetingId('')
      
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeDefined()
        expect(result.error.code).toBeDefined()
        expect(result.error.message).toBeDefined()
        expect(result.error.context).toBeDefined()
      }
    })

    it('includes error context for debugging', () => {
      const invalidId = 'invalid<>id'
      const result = createMeetingId(invalidId)
      
      if (!result.success) {
        expect(result.error.context).toMatchObject({
          input: invalidId,
          type: 'MeetingId'
        })
      }
    })

    it('provides different error codes for different validation failures', () => {
      const emptyResult = createMeetingId('')
      const longResult = createMeetingId('a'.repeat(300))
      
      expect(!emptyResult.success && !longResult.success).toBe(true)
      if (!emptyResult.success && !longResult.success) {
        expect(emptyResult.error.code).not.toBe(longResult.error.code)
      }
    })
  })

  describe('Serialization and Deserialization', () => {
    it('serializes branded types to JSON correctly', () => {
      const result = createMeetingId('test-meeting')
      if (result.success) {
        const serialized = JSON.stringify({ meetingId: result.data })
        const parsed = JSON.parse(serialized)
        
        expect(parsed.meetingId).toBe('test-meeting')
      }
    })

    it('deserializes and reconstructs branded types', () => {
      const originalId = 'test-meeting'
      const serialized = JSON.stringify({ meetingId: originalId })
      const parsed = JSON.parse(serialized)
      
      const reconstructed = createMeetingId(parsed.meetingId)
      expect(reconstructed.success).toBe(true)
      if (reconstructed.success) {
        expect(reconstructed.data).toBe(originalId)
      }
    })
  })

  describe('Performance', () => {
    it('creates branded types efficiently', () => {
      const iterations = 1000
      const start = performance.now()
      
      for (let i = 0; i < iterations; i++) {
        const result = createMeetingId(`meeting-${i}`)
        expect(result.success).toBe(true)
      }
      
      const end = performance.now()
      const timePerIteration = (end - start) / iterations
      
      // Should be very fast (less than 1ms per creation)
      expect(timePerIteration).toBeLessThan(1)
    })

    it('validates efficiently with memoization', () => {
      const testId = 'test-meeting-123'
      const iterations = 100
      const start = performance.now()
      
      for (let i = 0; i < iterations; i++) {
        validateMeetingIdFormat(testId)
      }
      
      const end = performance.now()
      const totalTime = end - start
      
      // Repeated validation of same input should be very fast
      expect(totalTime).toBeLessThan(100) // Less than 100ms total
    })
  })

  describe('Integration with Existing Systems', () => {
    it('works with database query builders', () => {
      const result = createMeetingId('db-meeting-123')
      if (result.success) {
        const meetingId = result.data
        
        // Simulate database query (string concatenation)
        const query = `SELECT * FROM meetings WHERE id = '${meetingId}'`
        expect(query).toBe("SELECT * FROM meetings WHERE id = 'db-meeting-123'")
      }
    })

    it('works with API request/response cycles', () => {
      const result = createMeetingId('api-meeting-456')
      if (result.success) {
        const meetingId = result.data
        
        // Simulate API response
        const apiResponse = {
          meetingId: meetingId,
          status: 'success'
        }
        
        expect(apiResponse.meetingId).toBe('api-meeting-456')
      }
    })

    it('integrates with existing validation libraries', () => {
      // Simulate integration with Zod or similar
      const result = createMeetingId('validation-test')
      if (result.success) {
        const meetingId = result.data
        
        // Should work with string validators
        expect(typeof meetingId).toBe('string')
        expect(meetingId.length).toBeGreaterThan(0)
      }
    })
  })
})