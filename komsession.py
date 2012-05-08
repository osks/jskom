#!/usr/bin/env python
# -*- coding: utf-8 -*-

import mimeparse
import json

import kom
import komauxitems
import thkom

import version

class KomSessionError(Exception): pass
class AmbiguousName(KomSessionError): pass
class NameNotFound(KomSessionError): pass
class NoRecipients(KomSessionError): pass


MIRecipient_type_to_str = { kom.MIR_TO: 'to',
                            kom.MIR_CC: 'cc',
                            kom.MIR_BCC: 'bcc' }

MIRecipient_str_to_type = { 'to': kom.MIR_TO,
                            'cc': kom.MIR_CC,
                            'bcc': kom.MIR_BCC }

MICommentTo_type_to_str = { kom.MIC_COMMENT: 'comment',
                            kom.MIC_FOOTNOTE: 'footnote' }

MICommentTo_str_to_type = { 'comment': kom.MIC_COMMENT,
                            'footnote': kom.MIC_FOOTNOTE }

MICommentIn_type_to_str = { kom.MIC_COMMENT: 'comment',
                            kom.MIC_FOOTNOTE: 'footnote' }

MICommentIn_str_to_type = { 'comment': kom.MIC_COMMENT,
                            'footnote': kom.MIC_FOOTNOTE }



class KomSession(object):
    def __init__(self, host, port=4894):
        self.host = host
        self.port = port
        self.conn = None
        
    def connect(self):
        self.conn = thkom.ThreadedConnection(self.host, self.port, user="httpkom")
    
    def disconnect(self):
        self.conn.continue_read_loop = False # stops the async thread in ThreadedConnection
        self.conn.socket.close()
        self.conn = None
    
    def login(self, username, password):
        pers_no = self.lookup_name_exact(username, True, False)
        kom.ReqLogin(self.conn, pers_no, password).response()
        kom.ReqSetClientVersion(self.conn, version.name, version.version)
        self.conn.set_user(pers_no)
    
    def logout(self):
        kom.ReqLogout(self.conn).response()
    
    def current_user(self):
        return self.conn.get_user()
    
    def lookup_name(self, name, want_pers, want_confs):
        return self.conn.lookup_name(name, want_pers, want_confs)

    def lookup_name_exact(self, name, want_pers, want_confs):
        matches = self.lookup_name(name, True, True)
        if len(matches) == 0:
            raise NameNotFound("recipient not found: %s" % name)
        elif len(matches) <> 1:
            raise AmbiguousName("ambiguous recipient: %s" % name)
        return matches[0][0]

    def get_text_stat(self, text_no):
        return self.conn.textstats[text_no]
        
    def get_conf_name(self, conf_no):
        return self.conn.conf_name(conf_no)
    
    def get_conferences(self, unread=False, micro=True):
        if unread:
            conf_nos = kom.ReqGetUnreadConfs(self.conn, self.current_user()).response()
            return [ self.get_conference(conf_no, micro) for conf_no in conf_nos ]
        raise NotImplementedError()
        
    def get_conference(self, conf_no, micro=True):
        if micro:
            return KomUConference(conf_no, self.conn.uconferences[conf_no])
        else:
            return KomConference(conf_no, self.conn.conferences[conf_no])

    def get_unread_in_conference(self, conf_no):
        return self.conn.get_unread_texts(conf_no)
    
    def get_text(self, text_no):
        text_stat = self.get_text_stat(text_no)
        text = kom.ReqGetText(self.conn, text_no).response()
        return KomText(text_no=text_no, text=text, text_stat=text_stat)
    
    def create_text(self, komtext):
        misc_info = kom.CookedMiscInfo()
        
        for rec in komtext.recipient_list:
            misc_info.recipient_list.append(rec)
        
        for ct in komtext.comment_to_list:
            misc_info.comment_to_list.append(ct)
        
        aux_items = []
        aux_items.append(kom.AuxItem(kom.AI_CREATING_SOFTWARE,
                                     data="%s %s" % (version.name, version.version)))
        aux_items.append(kom.AuxItem(kom.AI_CONTENT_TYPE,
                                     data=komtext.get_content_type_str()))
        
        text_no = kom.ReqCreateText(self.conn, komtext.get_text(),
                                    misc_info, aux_items).response()
        return text_no

    def mark_as_read_local(self, local_text_no, conf_no):
        try:
            kom.ReqMarkAsRead(self.conn, conf_no, [local_text_no]).response()
        except kom.NotMember:
            pass
    
    def mark_as_read(self, text_no):
        text_stat = self.get_text_stat(text_no)
        for mi in text_stat.misc_info.recipient_list:
            self.mark_as_read_local(mi.loc_no, mi.recpt)


class KomConference(object):
    def __init__(self, conf_no=None, conf=None):
        self.conf_no = conf_no
        
        if conf is not None:
            self.name = conf.name.decode('latin1')
            self.type = conf.type
            self.creation_time = conf.creation_time
            self.last_written = conf.last_written
            self.creator = conf.creator
            self.presentation = conf.presentation
            self.supervisor = conf.supervisor
            self.permitted_submitters = conf.permitted_submitters
            self.super_conf = conf.super_conf
            self.msg_of_day = conf.msg_of_day
            self.nice = conf.nice
            self.keep_commented = conf.keep_commented
            self.no_of_members = conf.no_of_members
            self.first_local_no = conf.first_local_no
            self.no_of_texts = conf.no_of_texts
            self.expire = conf.expire
            # auxitems?


class KomUConference(object):
    def __init__(self, conf_no=None, uconf=None):
        self.conf_no = conf_no
        
        if uconf is not None:
            self.name = uconf.name.decode('latin1')
            self.type = uconf.type
            self.highest_local_no = uconf.highest_local_no
            self.nice = uconf.nice


class KomText(object):
    def __init__(self, text_no=None, text=None, text_stat=None):
        self.text_no = text_no
        
        if text_stat is not None:
            mime_type, encoding = parse_content_type(
                self._get_content_type_from_text_stat(text_stat))
            self.content_type=mime_type_tuple_to_str(mime_type)
            
            self.creation_time=text_stat.creation_time
            self.author=text_stat.author
            self.recipient_list=text_stat.misc_info.recipient_list
            self.comment_to_list=text_stat.misc_info.comment_to_list
            self.comment_in_list=text_stat.misc_info.comment_in_list
            
            # text_stat is required for this
            if text is not None:
                # If a text has no new lines, it only has a body
                if text.find('\n') == -1:
                    self.subject = ""
                    rawbody = text
                else:
                    rawsubject, rawbody = text.split('\n', 1)
                    self.subject = decode_text(rawsubject, encoding)
                
                # TODO: only parse body if media type is text, and not an
                # image, for example.  Also, if the subject is empty,
                # everything becomes the subject, which will get decoded.
                # Figure out how to handle all this. Assume empty subject
                # means everything in body?
                self.body = decode_text(rawbody, encoding)
    
    def get_text(self):
        text = self.subject + "\n" + self.body
        # TODO: how would this work with images? not very well...
        text = text.encode('utf-8')
        return text

    def get_content_type_str(self):
        # TODO: This will not handle non-text stuff
        mime_type = mimeparse.parse_mime_type(self.content_type)
        mime_type[2]['charset'] = 'utf-8'
        content_type = mime_type_tuple_to_str(mime_type)
        return content_type
        
    def _get_content_type_from_text_stat(self, text_stat):
        try:
            contenttype = kom.first_aux_items_with_tag(
                text_stat.aux_items, komauxitems.AI_CONTENT_TYPE).data.decode('latin1')
        except AttributeError:
            contenttype = 'text/plain'
        return contenttype
        


def to_dict(obj, lookups=False, session=None):
    if isinstance(obj, list):
        return [ to_dict(el, lookups, session) for el in obj ]
    elif isinstance(obj, KomText):
        return KomText_to_dict(obj, lookups, session)
    elif isinstance(obj, kom.MIRecipient):
        return MIRecipient_to_dict(obj, lookups, session)
    elif isinstance(obj, kom.MICommentTo):
        return MICommentTo_to_dict(obj, lookups, session)
    elif isinstance(obj, kom.MICommentIn):
        return MICommentIn_to_dict(obj, lookups, session)
    elif isinstance(obj, KomConference):
        return KomConference_to_dict(obj, lookups, session)
    elif isinstance(obj, KomUConference):
        return KomUConference_to_dict(obj, lookups, session)
    elif isinstance(obj, kom.ConfType):
        return ConfType_to_dict(obj, lookups, session)
    else:
        #raise NotImplementedError("to_dict is not implemented for: %s" % type(obj))
        return obj

def from_dict(d, cls, lookups=False, session=None):
    if cls == KomText:
        return KomText_from_dict(d, lookups, session)
    elif cls == kom.MIRecipient:
        return MIRecipient_from_dict(d, lookups, session)
    elif cls == kom.MICommentTo:
        return MICommentTo_from_dict(d, lookups, session)
    elif cls == kom.MICommentIn:
        return MICommentIn_from_dict(d, lookups, session)
    else:
        raise NotImplementedError("from_dict is not implemented for: %s" % cls)

def ConfType_to_dict(conf_type, lookups, session):
    return dict(
        rd_prot=conf_type.rd_prot,
        original=conf_type.original,
        secret=conf_type.secret,
        letterbox=conf_type.letterbox,
        allow_anonymous=conf_type.allow_anonymous,
        forbid_secret=conf_type.forbid_secret,
        reserved2=conf_type.reserved2,
        reserved3=conf_type.reserved3)

def KomConference_to_dict(conf, lookups, session):
    return dict(
        conf_no=conf.conf_no,
        name=conf.name.decode('latin1'),
        type=to_dict(conf.type),
        creation_time=conf.creation_time.to_date_and_time(),
        last_written=conf.last_written.to_date_and_time(),
        creator=pers_to_dict(conf.creator, lookups, session),
        presentation=conf.presentation,
        supervisor=conf_to_dict(conf.supervisor, lookups, session),
        permitted_submitters=conf_to_dict(conf.permitted_submitters, lookups, session),
        super_conf=conf_to_dict(conf.super_conf, lookups, session),
        msg_of_day=conf.msg_of_day,
        nice=conf.nice,
        keep_commented=conf.keep_commented,
        no_of_members=conf.no_of_members,
        first_local_no=conf.first_local_no,
        no_of_texts=conf.no_of_texts,
        expire=conf.expire
        #aux-items
        )

def KomUConference_to_dict(conf, lookups, session):
    return dict(
        conf_no=conf.conf_no,
        name=conf.name.decode('latin1'),
        type=to_dict(conf.type),
        highest_local_no=conf.highest_local_no,
        nice=conf.nice
        )

def KomText_to_dict(komtext, lookups, session):
    return dict(
        text_no=komtext.text_no,
        creation_time=komtext.creation_time.to_date_and_time(),
        author=pers_to_dict(komtext.author, lookups, session),
        content_type=komtext.content_type,
        subject=komtext.subject,
        body=komtext.body,
        recipient_list=[ to_dict(r, lookups, session)
                         for r in komtext.recipient_list ],
        comment_to_list=[ to_dict(ct, lookups, session)
                          for ct in komtext.comment_to_list ],
        comment_in_list=[ to_dict(ci, lookups, session)
                          for ci in komtext.comment_in_list ])

def KomText_from_dict(d, lookups, session):
    kt = KomText()
    
    # Parse the content_type for some kind of basic test. Remove
    # charset / encoding param if it exist, and keep the rest. The subject
    # and body will not be encoded here.
    mime_type, encoding = parse_content_type(d['content_type'])
    kt.content_type = mime_type_tuple_to_str(mime_type)
    kt.subject = d['subject']
    kt.body = d['body']
    
    kt.recipient_list = []
    if 'recipient_list' in d:
        for r in d['recipient_list']:
            kt.recipient_list.append(from_dict(r, kom.MIRecipient, lookups, session))
    
    kt.comment_to_list = []
    if 'comment_to_list' in d:
        for ct in d['comment_to_list']:
            kt.comment_to_list.append(from_dict(ct, kom.MICommentTo, lookups, session))
    
    # comment_in typically makes no sense here, but we add them anyway
    # for sake of completeness. The reason it makes little sense is
    # because the primary usage for this function is when creating a
    # new text, and you cannot decide which texts that should be
    # comments to your new text. However, we don't know for sure here
    # what the purpose is, so we leave it to KomSession.create_text to not
    # make use of kt.comment_in_list.
    kt.comment_in_list = []
    if 'comment_in_list' in d:
        for ci in d['comment_in_list']:
            kt.comment_in_list.append(from_dict(ci, kom.MICommentIn, lookups, session))
    
    return kt

def pers_to_dict(author, lookups, session):
    if lookups:
        return dict(pers_no=author, pers_name=session.get_conf_name(author))
    else:
        return dict(pers_no=author)

def conf_to_dict(conf_no, lookups, session):
    if lookups:
        return dict(conf_no=conf_no, conf_name=session.get_conf_name(conf_no))
    else:
        return dict(conf_no=conf_no)

def MIRecipient_to_dict(mir, lookups, session):
    if not mir.type in MIRecipient_type_to_str:
        raise KeyError("Unknown MIRecipient type: %s" % mir.type)
    
    return dict(type=MIRecipient_type_to_str[mir.type],
                recpt=conf_to_dict(mir.recpt, lookups, session),
                loc_no=mir.loc_no)

def MIRecipient_from_dict(d, lookups, session):
    if d['type'] not in MIRecipient_str_to_type:
        raise KeyError("Unknown MIRecipient type str: %s" % d['type'])
    
    if 'conf_no' in d['recpt']:
        conf_no = d['recpt']['conf_no']
    else:
        if lookups:
            conf_no = session.lookup_name_exact(d['recpt']['conf_name'], True, True)
        else:
            conf_no = None
    
    return kom.MIRecipient(type=MIRecipient_str_to_type[d['type']], recpt=conf_no)

def MICommentTo_to_dict(micto, lookups, session):
    if not micto.type in MICommentTo_type_to_str:
        raise KeyError("Unknown MICommentTo type: %s" % micto.type)
    
    cts = session.get_text_stat(micto.text_no)
    return dict(type=MICommentTo_type_to_str[micto.type],
                text_no=micto.text_no,
                author=pers_to_dict(cts.author, lookups, session))

def MICommentTo_from_dict(d, lookups, session):
    if d['type'] not in MICommentTo_str_to_type:
        raise KeyError("Unknown MICommentTo type str: %s" % d['type'])
    
    return kom.MICommentTo(type=MICommentTo_str_to_type[d['type']], text_no=d['text_no'])

def MICommentIn_to_dict(micin, lookups, session):
    if not micin.type in MICommentIn_type_to_str:
        raise KeyError("Unknown MICommentIn type: %s" % micin.type)
    
    cts = session.get_text_stat(micin.text_no)
    return dict(type=MICommentIn_type_to_str[micin.type],
                text_no=micin.text_no,
                author=pers_to_dict(cts.author, lookups, session))

def MICommentIn_from_dict(d, lookups, session):
    if d['type'] not in MICommentIn_str_to_type:
        raise KeyError("Unknown MICommentIn type str: %s" % d['type'])
    
    return kom.MICommentTo(type=MICommentIn_str_to_type[d['type']], text_no=d['text_no'])


# Misc functions

def decode_text(text, encoding, backup_encoding='latin1'):
    try:
        decoded_text = text.decode(encoding)
    except UnicodeDecodeError:
        # (from iKOM) Fscking clients that can't detect coding...
        decoded_text = text.decode(backup_encoding)
    
    return decoded_text

def parse_content_type(contenttype):
    mime_type = mimeparse.parse_mime_type(contenttype)
    
    if "charset" in mime_type[2]:
        # Remove charset from mime_type, if we have it
        encoding = mime_type[2].pop("charset")
    else:
        encoding = 'latin1'
    
    if encoding == 'x-ctext':
        encoding = 'latin1' # trying to parse x-ctext as latin1 as backup
    
    return mime_type, encoding

def mime_type_tuple_to_str(mime_type):
    params = [ "%s=%s" % (k, v) for k, v in mime_type[2].items() ]
    t = "%s/%s" % (mime_type[0], mime_type[1])
    l = [t]
    l.extend(params)
    return ";".join(l)
