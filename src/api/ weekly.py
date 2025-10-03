from datetime import datetime
def handler(request):
    return {
      "statusCode": 200,
      "headers": {"Content-Type": "application/json"},
      "body": '{"weeklyDone":[{"weekStart":"%s","count":4}]}' % datetime.utcnow().date().isoformat()
    }