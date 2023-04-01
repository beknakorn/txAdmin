-- Setting global enablle/disable variable for all sv_*.lua files
TX_SERVER_MODE = (GetConvar('txAdminServerMode', 'false') == 'true')

-- Prevent running in monitor mode
if not TX_SERVER_MODE then return end


debugModeEnabled = false

CreateThread(function()
  debugModeEnabled = (GetConvar('txAdmin-menuDebug', 'false') == 'true')
end)

---FIXME: description
function debugPrint(...)
  local args = {...}
  local appendedStr = ''
  if debugModeEnabled then
    for _, v in ipairs(args) do
      appendedStr = appendedStr .. ' ' .. (type(v)=="table" and json.encode(v) or tostring(v))
    end
    local msgTemplate = '^3[txAdminMenu]^0%s^0'
    local msg = msgTemplate:format(appendedStr)
    print(msg)
  end
end

--- Used whenever we want to convey a message as from txAdminMenu without
--- being in debug mode.
function txPrint(...)
  local args = {...}
  local appendedStr = ''
  for _, v in ipairs(args) do
    appendedStr = appendedStr .. ' ' .. tostring(v)
  end
  local msgTemplate = '^3[txAdminMenu]^0%s^0'
  local msg = msgTemplate:format(appendedStr)
  print(msg)
end

---FIXME: description
---@param tgtTable table
---@param value any
---@return integer
function tableIndexOf(tgtTable, value)
  for i=1, #tgtTable do
    debugPrint(('tgtTableVal: %s, value: %s'):format(tgtTable[i], value))
    if tgtTable[i] == value then
      return i
    end
  end
  return -1
end